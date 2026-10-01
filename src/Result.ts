type Success<T> = { readonly tag: "success"; readonly value: T };
type Failure<E> = { readonly tag: "failure"; readonly error: E };

const MISSING_ERROR_MESSAGE = "[Result]: Error expected.";

function defaultErrorMapper<E>(e: unknown): E {
  return (e instanceof Error ? e : new Error(toErrorMessage(e))) as E;
}

export class Result<T, E = Error> {
  private constructor(private readonly _inner: Success<T> | Failure<E>) {}

  static success<T, E = Error>(value: T): Result<T, E> {
    return new Result({ tag: "success", value });
  }

  static failure<T, E = Error>(error: E): Result<T, E> {
    return new Result({ tag: "failure", error });
  }

  static fromThrowable<T, E = Error>(
    fn: () => T,
    onErr: (e: unknown) => E = defaultErrorMapper<E>,
  ): Result<T, E> {
    try {
      return Result.success(fn());
    } catch (err) {
      return Result.failure(onErr(err));
    }
  }

  static async fromPromise<T, E = Error>(
    input: (() => Promise<T>) | Promise<T>,
    onErr: (e: unknown) => E = defaultErrorMapper<E>,
  ): Promise<Result<T, E>> {
    try {
      const promise = typeof input === "function" ? input() : input;
      return Result.success<T, E>(await promise);
    } catch (e) {
      return Result.failure<T, E>(onErr(e));
    }
  }

  static all<T, E>(results: readonly Result<T, E>[]): Result<T[], E>;
  static all<T extends readonly unknown[], E>(
    results: {
      [K in keyof T]: Result<T[K], E>;
    },
  ): Result<T, E>;
  static all(
    results: readonly Result<unknown, unknown>[],
  ): Result<unknown[], unknown> {
    const values: unknown[] = [];
    for (const r of results) {
      if (r._inner.tag === "failure") return Result.failure(r._inner.error);
      values.push((r._inner as Success<unknown>).value);
    }
    return Result.success(values);
  }

  isSuccess(): this is Result<T, never> {
    return this._inner.tag === "success";
  }

  isFailure(): this is Result<never, E> {
    return this._inner.tag === "failure";
  }

  getOrNull(): T | null {
    return this._inner.tag === "success" ? this._inner.value : null;
  }

  getOrElse(defaultValue: T): T {
    return this._inner.tag === "success" ? this._inner.value : defaultValue;
  }

  getOrElseGet(fn: () => T): T {
    return this._inner.tag === "success" ? this._inner.value : fn();
  }

  getOrThrow(): T;
  getOrThrow(mapErr: (e: E) => Error): T;
  getOrThrow(mapErr?: (e: E) => Error): T {
    if (this._inner.tag === "success") return this._inner.value;
    if (mapErr) throw mapErr(this._inner.error);
    throw this._inner.error;
  }

  getFailureOrNull(): E | null {
    return this._inner.tag === "failure" ? this._inner.error : null;
  }

  orElse<F = E>(fn: (error: E) => Result<T, F>): Result<T, F> {
    return this.fold((v) => Result.success(v), fn);
  }

  getError(): E {
    if (this._inner.tag === "failure") {
      return this._inner.error;
    }
    throw new Error(MISSING_ERROR_MESSAGE);
  }

  fold<R, S>(onSuccess: (value: T) => R, onFailure: (error: E) => S): R | S {
    return this._inner.tag === "success"
      ? onSuccess(this._inner.value)
      : onFailure(this._inner.error);
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return this.fold(
      (v) => Result.success(fn(v)),
      (e) => Result.failure(e),
    );
  }

  chain<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return this.fold(fn, (e) => Result.failure(e));
  }

  async mapAsync<U>(fn: (value: T) => Promise<U>): Promise<Result<U, E>> {
    if (this._inner.tag === "failure") return Result.failure(this._inner.error);
    return Result.success(await fn(this._inner.value));
  }

  async chainAsync<U>(
    fn: (value: T) => Promise<Result<U, E>>,
  ): Promise<Result<U, E>> {
    if (this._inner.tag === "failure") return Result.failure(this._inner.error);
    return fn(this._inner.value);
  }

  flatten<U>(this: Result<Result<U, E>, E>): Result<U, E> {
    return this.chain((x) => x);
  }

  ap<U>(fnResult: Result<(value: T) => U, E>): Result<U, E> {
    return fnResult.chain((fn) => this.map(fn));
  }

  tap(fn: (value: T) => void): Result<T, E> {
    if (this._inner.tag === "success") fn(this._inner.value);
    return this;
  }

  tapError(fn: (error: E) => void): Result<T, E> {
    if (this._inner.tag === "failure") fn(this._inner.error);
    return this;
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    return this.fold(
      (v) => Result.success(v),
      (e) => Result.failure(fn(e)),
    );
  }

  toJSON() {
    return this.fold(
      (v) => ({ success: true, value: v }),
      (e) => ({ success: false, error: e }),
    );
  }

  toString(): string {
    return this.fold(
      (v) => `Success(${safeStringify(v)})`,
      (e) => `Failure(${e instanceof Error ? e.message : safeStringify(e)})`,
    );
  }
}

function safeStringify(x: unknown): string {
  try {
    return JSON.stringify(x) ?? String(x);
  } catch {
    return "[unserializable]";
  }
}

function toErrorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  return safeStringify(e);
}
