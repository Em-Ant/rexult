# Rexult

A lightweight, functional Result type for TypeScript.

The `Result` type represents an operation that can either succeed or fail. This library provides a small, dependency-free implementation with strict typing, usable in Node.js and modern browsers.

---

## Features

- Type-safe with strict TypeScript generics.
- Functional combinators: `map`, `chain`, `fold`, `mapError`, `orElse`.
- Sync and async pipelines: `mapAsync`, `chainAsync`, `fromPromise`.
- Aggregation with `Result.all`.
- Narrowing via `isSuccess` / `isFailure` type predicates.
- Zero dependencies, ESM + CJS builds via `tsup`.

---

## Installation

```bash
npm install rexult
```

or with pnpm:

```bash
pnpm add rexult
```

---

## Usage Examples

### Basic Usage

```ts
import { Result } from "rexult";

const success = Result.success<number, string>(42);
const failure = Result.failure<number, string>("boom");

console.log(success.isSuccess()); // true
console.log(failure.isFailure()); // true
```

Narrowing works with control flow:

```ts
const r: Result<number, string> = getResult();
if (r.isSuccess()) {
  // r: Result<number, never>
  console.log(r.getOrThrow());
} else {
  // r: Result<never, string>
  console.error(r.getError());
}
```

### Handling Errors

```ts
const divide = (a: number, b: number): Result<number, string> => {
  if (b === 0) return Result.failure("Division by zero");
  return Result.success(a / b);
};

divide(10, 2).fold(
  (val) => console.log(`Success: ${val}`),
  (err) => console.error(`Failed: ${err}`),
);
```

### Wrapping Throwing Code

```ts
const risky = (): Result<string, Error> =>
  Result.fromThrowable(() => {
    const data = JSON.parse("{ invalid json }");
    return data.name as string;
  });
```

With a custom error mapper:

```ts
const r = Result.fromThrowable(
  () => JSON.parse("bad"),
  (e) => new Error(`Parse failed: ${String(e)}`),
);
```

### Async Operations

```ts
const fetchUser = (id: number): Promise<Result<User, string>> =>
  Result.fromPromise(
    () => fetch(`/api/users/${id}`).then((res) => res.json()),
    (e) => `Failed to fetch user: ${String(e)}`,
  );

// A direct promise works too:
const r = await Result.fromPromise(fetch("/api/users/1").then((res) => res.json()));
```

Async combinators short-circuit on failure. Rejections from `fn` propagate as rejections, they are not captured as failures:

```ts
const doubled = await Result.success<number, string>(5).mapAsync(async (x) => x * 2);
// success(10)

const chained = await Result.success<number, string>(5).chainAsync(async (x) =>
  Result.success<string, string>(String(x)),
);
// success("5")
```

### Aggregating Results

`Result.all` is fail-fast: it returns the first failure, otherwise all values in order. Tuple types are preserved.

```ts
const r = Result.all([
  Result.success<number, string>(1),
  Result.success<string, string>("a"),
]);

r.getOrThrow(); // [1, "a"] typed as [number, string]
```

const failed = Result.all([
  Result.success<number, string>(1),
  Result.failure<number, string>("first"),
  Result.failure<number, string>("second"),
]);
// failure("first")
```

### Chaining and Mapping

```ts
const result = Result.success<number, string>(5)
  .map((x) => x * 2)
  .chain((x) => (x > 5 ? Result.success(x) : Result.failure("too small")));
```

### Transforming and Recovering

```ts
const transformed = Result.failure<number, string>("Oops").mapError(
  (msg) => new Error(`Custom error: ${msg}`),
);

const recovered = Result.failure<number, string>("err").orElse(() =>
  Result.success(100),
);
```

### Extracting Values

```ts
const ok = Result.success<number, string>(42);
ok.getOrElse(-1); // 42
ok.getOrNull(); // 42
ok.getOrThrow(); // 42

const bad = Result.failure<number, string>("err");
bad.getOrElse(-1); // -1
bad.getOrNull(); // null
bad.getFailureOrNull(); // "err"

// Wrap a non-Error failure into an Error before throwing:
bad.getOrThrow((e) => new Error(`Request failed: ${e}`)); // throws Error

// Without a mapper, getOrThrow rethrows the raw failure value:
bad.getOrThrow(); // throws "err"

// getError returns the failure, or throws if called on success:
bad.getError(); // "err"
ok.getError(); // throws Error("[Result]: Error expected.")
```

---

## API Reference

### Constructors

| Method | Description |
| --- | --- |
| `Result.success<T, E>(value)` | Creates a successful result. |
| `Result.failure<T, E>(error)` | Creates a failed result. |
| `Result.fromThrowable<T, E>(fn, onErr?)` | Wraps a function that may throw. Default `onErr` wraps non-`Error` values in `Error` (objects via JSON, not `[object Object]`). |
| `Result.fromPromise<T, E>(fnOrPromise, onErr?)` | Accepts `() => Promise<T>` or a direct `Promise<T>`. Returns `Promise<Result<T, E>>`. Same default `onErr`. |
| `Result.all<T, E>(results)` | Fail-fast aggregation. First failure wins, otherwise `success(values)` in order. `[]` returns `success([])`. Tuple input preserves tuple type: `all([success(1), success("a")])` → `Result<[number, string], E>`. |

### Instance Methods

| Method | Description |
| --- | --- |
| `isSuccess()` | Type predicate, narrows to `Result<T, never>`. |
| `isFailure()` | Type predicate, narrows to `Result<never, E>`. |
| `getOrNull()` | Value on success, otherwise `null`. Ambiguous if `T` includes `null`. |
| `getOrElse(defaultValue)` | Value on success, otherwise `defaultValue` (eager). |
| `getOrElseGet(fn)` | Lazy variant: value on success, otherwise `fn()`. |
| `getOrThrow()` | Value on success, otherwise throws the raw failure. |
| `getOrThrow(mapErr)` | Value on success, otherwise throws `mapErr(error)` as `Error`. |
| `getFailureOrNull()` | Error on failure, otherwise `null`. Ambiguous if `E` includes `null`. |
| `getError()` | Error on failure, otherwise throws `Error("[Result]: Error expected.")`. |
| `fold(onSuccess, onFailure)` | Applies one of two functions. Return types may differ. |
| `map(fn)` | Transforms the success value. |
| `chain(fn)` | Chains another `Result` computation. |
| `mapAsync(fn)` | Async `map`. Short-circuits on failure. Async rejections propagate. |
| `chainAsync(fn)` | Async `chain`. Short-circuits on failure. Async rejections propagate. |
| `flatten()` | Flattens `Result<Result<T, E>, E>` into `Result<T, E>`. |
| `ap(fnResult)` | Applies a wrapped function to the value. Called as `value.ap(fnResult)`. |
| `tap(fn)` | Runs a side effect on success, returns the same result. |
| `tapError(fn)` | Runs a side effect on failure, returns the same result. |
| `mapError(fn)` | Transforms the error value. |
| `orElse(fn)` | Recovers from failure with another result. |
| `toJSON()` | Plain object: `{ success: true, value }` or `{ success: false, error }`. |
| `toString()` | `Success(<json>)` or `Failure(<message|json>)`. Circular values render as `[unserializable]`. |

---

## Type Safety

```ts
const res: Result<number, string> = Result.success(42);
// res.map((x) => x.toString()) -> Result<string, string>
```

Prefer `fold`, `map`, `chain`, and the `isSuccess` / `isFailure` predicates over manual unwrapping. When the failure type is not an `Error` (for example a `ResponseFailure` object), use `getOrThrow(mapErr)` or `mapError` to convert to `Error` at the boundary instead of throwing raw values.

---

## Notes on 0.0.4

- `getError()` now throws on success instead of returning a dummy `Error` cast to `E`.
- Added `Result.all`, `getOrThrow(mapErr)`, `mapAsync`, `chainAsync`, and `isSuccess` / `isFailure` narrowing.
- Fixed `package.json` `module` field (`dist/index.js`, matching the `tsup` ESM output) and added `"sideEffects": false`.
- No other breaking changes.

---

## Testing

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Coverage report:

```bash
npm run test:coverage
```

---

## Development Setup

Install dev dependencies:

```bash
npm install
```

Build project:

```bash
npm run build
```

Watch mode:

```bash
npm run dev
```

Lint code:

```bash
npm run lint
```

Format code:

```bash
npm run format
```

Typecheck:

```bash
npm run typecheck
```

---

## License

MIT (c) [Em-Ant](https://github.com/Em-Ant)
