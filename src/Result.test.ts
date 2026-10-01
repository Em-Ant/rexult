import { describe, expect, it, vi } from "vitest";
import { Result } from "./Result";

describe("Result", () => {
  it("should handle success case", () => {
    const result = Result.success<number, Error>(42);

    expect(result.isSuccess()).toBe(true);
    expect(result.isFailure()).toBe(false);
    expect(result.getOrNull()).toBe(42);
    expect(result.getOrElse(0)).toBe(42);
    expect(result.getOrThrow()).toBe(42);
  });

  it("should handle failure case", () => {
    const error = new Error("test error");
    const result = Result.failure<number, Error>(error);

    expect(result.isSuccess()).toBe(false);
    expect(result.isFailure()).toBe(true);
    expect(result.getOrNull()).toBeNull();
    expect(result.getOrElse(0)).toBe(0);
    expect(result.getFailureOrNull()).toBe(error);
    expect(() => result.getOrThrow()).toThrow(error);
  });

  // -----------------------------
  // fold
  // -----------------------------

  it("should handle fold operation", () => {
    const successResult = Result.success<number, Error>(42);
    const failureResult = Result.failure<number, Error>(new Error("test"));

    let value = 0;
    successResult.fold(
      (v) => {
        value = v;
      },
      () => {
        value = -1;
      },
    );
    expect(value).toBe(42);

    failureResult.fold(
      () => {
        value = 100;
      },
      () => {
        value = -1;
      },
    );
    expect(value).toBe(-1);
  });

  it("should allow different return types in fold", () => {
    const success = Result.success<string, number>("hello");
    const failure = Result.failure<string, number>(404);

    const output1 = success.fold(
      (s) => s.length,
      (n) => `Error: ${n}`,
    );
    expect(output1).toBe(5); // string → number

    const output2 = failure.fold(
      (s) => s.length,
      (n) => `Error: ${n}`,
    );
    expect(output2).toBe("Error: 404"); // number → string

    // Ensure union type works
    const output3: number | string = success.fold(
      (s) => s.length,
      (n) => `Error: ${n}`,
    );
    expect(output3).toBe(5);
  });

  it("should map success value", () => {
    const result = Result.success(5).map((x) => x * 2);
    expect(result.getOrThrow()).toBe(10);
  });

  it("should leave failure unchanged when mapping", () => {
    const error = new Error("original");
    const result = Result.failure<number, Error>(error).map((x) => x * 2);
    expect(result.isFailure()).toBe(true);
    expect(result.getFailureOrNull()).toBe(error);
  });

  it("should chain on success", () => {
    const result = Result.success(5).chain((x) => Result.success(x.toString()));
    expect(result.getOrThrow()).toBe("5");
  });

  it("should short-circuit chain on failure", () => {
    const error = new Error("failed");
    const result = Result.failure<number, Error>(error).chain((x) =>
      Result.success(x.toString()),
    );
    expect(result.isFailure()).toBe(true);
    expect(result.getFailureOrNull()).toBe(error);
  });

  it("should flatten nested successes", () => {
    const nested = Result.success(Result.success(42));
    const flat = nested.flatten();
    expect(flat.getOrThrow()).toBe(42);
  });

  it("should flatten outer failure", () => {
    const error1 = new Error("outer");
    const nested: Result<Result<number, Error>, Error> = Result.failure(error1);
    const flat = nested.flatten();
    expect(flat.isFailure()).toBe(true);
    expect(flat.getFailureOrNull()).toBe(error1);
  });

  it("should flatten inner failure", () => {
    const error2 = new Error("inner");
    const nested: Result<Result<number, Error>, Error> = Result.success(
      Result.failure(error2),
    );
    const flat = nested.flatten();
    expect(flat.isFailure()).toBe(true);
    expect(flat.getFailureOrNull()).toBe(error2);
  });

  it("should apply function inside result", () => {
    const value = Result.success(5);
    const func = Result.success((x: number) => x * 2);

    const result = value.ap(func);
    expect(result.getOrThrow()).toBe(10);
  });

  it("should return failure if value is failure", () => {
    const value = Result.failure<number, string>("network error");
    const func = Result.success<(n: number) => number, string>(
      (x: number) => x * 2,
    );

    const result = value.ap(func);
    expect(result.isFailure()).toBe(true);
    expect(result.getFailureOrNull()).toBe("network error");
  });

  it("should return failure if function is failure", () => {
    const value = Result.success<number, string>(5);
    const func = Result.failure<(x: number) => number, string>("no fn");

    const result = value.ap(func);
    expect(result.isFailure()).toBe(true);
    expect(result.getFailureOrNull()).toBe("no fn");
  });

  it("should run tap callback on success", () => {
    const fn = vi.fn();
    const result = Result.success(42).tap(fn);
    expect(fn).toHaveBeenCalledWith(42);
    expect(result.isSuccess()).toBe(true);
  });

  it("should not run tap callback on failure", () => {
    const fn = vi.fn();
    const result = Result.failure<number, string>("err").tap(fn);
    expect(fn).not.toHaveBeenCalled();
    expect(result.isFailure()).toBe(true);
  });

  it("should run tapError callback on failure", () => {
    const fn = vi.fn();
    const result = Result.failure<number, string>("err").tapError(fn);
    expect(fn).toHaveBeenCalledWith("err");
    expect(result.isFailure()).toBe(true);
  });

  it("should not run tapError callback on success", () => {
    const fn = vi.fn();
    const result = Result.success(42).tapError(fn);
    expect(fn).not.toHaveBeenCalled();
    expect(result.isSuccess()).toBe(true);
  });

  it("should map error value", () => {
    const result = Result.failure<number, string>("bad request").mapError(
      (err) => new Error(`HTTP: ${err}`),
    );
    expect(result.isFailure()).toBe(true);
    const error = result.getFailureOrNull() as Error;
    expect(error.message).toBe("HTTP: bad request");
  });

  it("should leave success unchanged when mapping error", () => {
    const result = Result.success<number, string>(42).mapError(
      (err: string) => new Error(err),
    );
    expect(result.getOrThrow()).toBe(42);
  });

  it("should recover from failure with orElse", () => {
    const originalError = "original";
    const result = Result.failure<number, string>(originalError).orElse(() =>
      Result.success(100),
    );

    expect(result.getOrThrow()).toBe(100);
  });

  it("should leave success unchanged in orElse", () => {
    const result = Result.success(42).orElse(() => Result.success(999));
    expect(result.getOrThrow()).toBe(42);
  });

  it("should create success from non-throwing function", () => {
    const result = Result.fromThrowable(() => 42);
    expect(result.getOrThrow()).toBe(42);
  });

  it("should create failure from throwing function", () => {
    const error = new Error("boom");
    const result = Result.fromThrowable(() => {
      throw error;
    });
    expect(result.isFailure()).toBe(true);
    expect(result.getFailureOrNull()).toBe(error);
  });

  it("should use custom error mapper in fromThrowable", () => {
    const result = Result.fromThrowable(
      () => {
        throw "raw error";
      },
      (e) => `ERR: ${String(e)}`,
    );
    expect(result.getFailureOrNull()).toBe("ERR: raw error");
  });

  it("should resolve promise to success", async () => {
    const result = await Result.fromPromise(() => Promise.resolve(42));
    expect(result.getOrThrow()).toBe(42);
  });

  it("should reject promise to failure", async () => {
    const error = new Error("async fail");
    const result = await Result.fromPromise(() => Promise.reject(error));
    expect(result.isFailure()).toBe(true);
    expect(result.getFailureOrNull()).toBe(error);
  });

  it("should use custom error mapper in fromPromise", async () => {
    const result = await Result.fromPromise(
      () => Promise.reject("raw"),
      (e) => `Mapped: ${String(e)}`,
    );
    expect(result.getFailureOrNull()).toBe("Mapped: raw");
  });

  it("should serialize success to JSON", () => {
    const result = Result.success({ name: "Alice" });
    expect(result.toJSON()).toEqual({
      success: true,
      value: { name: "Alice" },
    });
  });

  it("should serialize failure to JSON", () => {
    const error = { code: 404 };
    const result = Result.failure<string, typeof error>(error);
    expect(result.toJSON()).toEqual({ success: false, error });
  });

  it("should stringify success value", () => {
    const result = Result.success({ a: 1 });
    expect(result.toString()).toBe('Success({"a":1})');
  });

  it("should stringify error message if it is an Error", () => {
    const result = Result.failure<number, Error>(new Error("Network"));
    expect(result.toString()).toBe("Failure(Network)");
  });

  it("should stringify non-Error failure", () => {
    const result = Result.failure<number, { msg: string }>({ msg: "fail" });
    expect(result.toString()).toBe('Failure({"msg":"fail"})');
  });

  it("should handle unserializable values in toString", () => {
    // biome-ignore lint/suspicious/noExplicitAny: <circular deps unserializable testing>
    const circular: any = { a: 1 };
    circular.self = circular;
    const result = Result.success(circular);
    expect(result.toString()).toBe("Success([unserializable])");
  });

  it("should get error from failure", () => {
    const error = new Error("failed");
    const result = Result.failure<number, Error>(error);
    expect(result.getError()).toBe(error);
  });

  it("should throw when calling getError on success", () => {
    const result = Result.success(42);
    expect(() => result.getError()).toThrow("[Result]: Error expected.");
  });

  it("should map failure to Error in getOrThrow", () => {
    type ResponseFailure = { url: string; status: number };
    const failure: ResponseFailure = { url: "/api", status: 500 };
    const result = Result.failure<number, ResponseFailure>(failure);
    expect(() =>
      result.getOrThrow((e) => new Error(`Fetch ${e.url} failed: ${e.status}`)),
    ).toThrow("Fetch /api failed: 500");
  });

  it("should preserve raw throw in getOrThrow without mapper", () => {
    const result = Result.failure<number, string>("raw failure");
    expect(() => result.getOrThrow()).toThrow("raw failure");
  });

  it("should combine successes with Result.all", () => {
    const result = Result.all([
      Result.success<number, string>(1),
      Result.success<number, string>(2),
      Result.success<number, string>(3),
    ]);
    expect(result.getOrThrow()).toEqual([1, 2, 3]);
  });

  it("should return empty array for Result.all([])", () => {
    expect(Result.all([]).getOrThrow()).toEqual([]);
  });

  it("should fail fast with first failure in Result.all", () => {
    const result = Result.all([
      Result.success<number, string>(1),
      Result.failure<number, string>("first"),
      Result.failure<number, string>("second"),
    ]);
    expect(result.isFailure()).toBe(true);
    expect(result.getFailureOrNull()).toBe("first");
  });

  it("should mapAsync success value", async () => {
    const result = await Result.success<number, string>(5).mapAsync(async (x) =>
      String(x * 2),
    );
    expect(result.getOrThrow()).toBe("10");
  });

  it("should short-circuit mapAsync on failure", async () => {
    const result = await Result.failure<number, string>("err").mapAsync(
      async (x) => x * 2,
    );
    expect(result.getFailureOrNull()).toBe("err");
  });

  it("should chainAsync success value", async () => {
    const result = await Result.success<number, string>(5).chainAsync(
      async (x) => Result.success<string, string>(String(x)),
    );
    expect(result.getOrThrow()).toBe("5");
  });

  it("should short-circuit chainAsync on failure", async () => {
    const result = await Result.failure<number, string>("err").chainAsync(
      async (x) => Result.success<string, string>(String(x)),
    );
    expect(result.getFailureOrNull()).toBe("err");
  });

  it("should preserve tuple types in Result.all", () => {
    const result = Result.all([
      Result.success<number, string>(1),
      Result.success<string, string>("a"),
    ]);
    // Type-level: [number, string], runtime: [1, "a"]
    const value: [number, string] = result.getOrThrow();
    expect(value).toEqual([1, "a"]);
  });

  it("should accept a direct promise in fromPromise", async () => {
    const ok = await Result.fromPromise(Promise.resolve(42));
    expect(ok.getOrThrow()).toBe(42);

    const err = await Result.fromPromise<number, string>(
      Promise.reject("bad"),
      (e) => `Mapped: ${String(e)}`,
    );
    expect(err.getFailureOrNull()).toBe("Mapped: bad");
  });

  it("should stringify object rejections instead of [object Object]", async () => {
    const result = await Result.fromPromise<number, Error>(
      Promise.reject({ code: 500 }),
    );
    expect(result.getFailureOrNull()).toBeInstanceOf(Error);
    expect((result.getFailureOrNull() as Error).message).toBe('{"code":500}');
  });

  it("should capture sync thunk throws in fromPromise as failure", async () => {
    const error = new Error("sync boom");
    const result = await Result.fromPromise<number, Error>(() => {
      throw error;
    });
    expect(result.isFailure()).toBe(true);
    expect(result.getFailureOrNull()).toBe(error);
  });

  it("should lazily evaluate getOrElseGet", () => {
    let calls = 0;
    const ok = Result.success<number, string>(1).getOrElseGet(() => {
      calls += 1;
      return 99;
    });
    expect(ok).toBe(1);
    expect(calls).toBe(0);

    const failed = Result.failure<number, string>("e").getOrElseGet(() => {
      calls += 1;
      return 99;
    });
    expect(failed).toBe(99);
    expect(calls).toBe(1);
  });
});
