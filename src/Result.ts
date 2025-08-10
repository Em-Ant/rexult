type Success<T> = { readonly tag: "success"; readonly value: T };
type Failure<E> = { readonly tag: "failure"; readonly error: E };

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
    onErr: (e: unknown) => E = (e) =>
      (e instanceof Error ? e : new Error(String(e))) as E,
  ): Result<T, E> {
    try {
      return Result.success(fn());
    } catch (err) {
      return Result.failure(onErr(err));
    }
  }

  static fromPromise<T, E = Error>(
    fn: () => Promise<T>,
    onErr: (e: unknown) => E = (e) =>
      (e instanceof Error ? e : new Error(String(e))) as E,
  ): Promise<Result<T, E>> {
    return fn()
      .then(Result.success<T, E>)
      .catch((e) => Result.failure(onErr(e)));
  }

  isSuccess(): boolean {
    return this._inner.tag === "success";
  }

  isFailure(): boolean {
    return this._inner.tag === "failure";
  }

  getOrNull(): T | null {
    return this._inner.tag === "success" ? this._inner.value : null;
  }

  getOrElse(defaultValue: T): T {
    return this._inner.tag === "success" ? this._inner.value : defaultValue;
  }

  getOrThrow(): T {
    if (this._inner.tag === "success") return this._inner.value;
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
    return new Error("[Result]: Error expected.") as E;
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
    return JSON.stringify(x);
  } catch {
    return "[unserializable]";
  }
}
