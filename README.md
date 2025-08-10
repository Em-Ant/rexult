# 🧪 Rexult

**A lightweight, functional Result type for TypeScript**

The `Result` type is a powerful abstraction used in functional programming to represent operations that can either succeed or fail. This library provides a clean and idiomatic implementation of the Result type in TypeScript.

---

## ✨ Features

- **Type-Safe**: Full TypeScript support with strict typing.
- **Functional**: Supports common FP patterns like `map`, `chain`, `fold`, etc.
- **Easy to Use**: Simple API designed for readability and ease of use.
- **Cross-Platform**: Works in Node.js and modern browsers.
- **Lightweight**: No dependencies beyond standard TS features.

---

## 📦 Installation

```bash
npm install rexult
```

or with pnpm:

```bash
pnpm add rexult
```

---

## 🔧 Usage Examples

### Basic Usage

```ts
import { Result } from "rexult";

const success = Result.success<number>("hello");
const failure = Result.failure<string>(new Error("Something went wrong"));

console.log(success.isSuccess()); // true
console.log(failure.isFailure()); // true
```

### Handling Errors Safely

```ts
const divide = (a: number, b: number): Result<number, string> => {
  if (b === 0) {
    return Result.failure("Division by zero");
  }
  return Result.success(a / b);
};

const result = divide(10, 2);

result.fold(
  (val) => console.log(`Success: ${val}`), // Success: 5
  (err) => console.error(`Failed: ${err}`) // Not called
);
```

### Using `fromThrowable` for Try-Catch Wrapping

```ts
const riskyOperation = (): Result<string, Error> => {
  return Result.fromThrowable(() => {
    const data = JSON.parse("{ invalid json }");
    return data.name;
  });
};

const result = riskyOperation();

result.fold(
  (value) => console.log(value),
  (error) => console.error(error.message)
);
```

### Async Operations with Promises

```ts
const fetchUser = async (id: number): Promise<Result<User, string>> => {
  return Result.fromPromise(
    () => fetch(`/api/users/${id}`).then((res) => res.json()),
    (e) => `Failed to fetch user: ${e}`
  );
};
```

### Chaining Results with `chain`

```ts
const processUserData = (userId: number): Result<string, string> => {
  return fetchUser(userId).chain((user) => {
    if (!user.active) {
      return Result.failure("User not active");
    }
    return Result.success(`Welcome back, ${user.name}`);
  });
};
```

### Mapping Over Results

```ts
const double = (x: number): number => x * 2;

const result = Result.success<number>(5);

const doubled = result.map(double); // Result.success(10)

doubled.fold(
  (val) => console.log(val), // 10
  (err) => console.error(err)
);
```

### Transforming Errors with `mapError`

```ts
const result = Result.failure<string>("Oops!");

const transformed = result.mapError((msg) => `Custom error: ${msg}`);

transformed.fold(
  (val) => console.log(val),
  (err) => console.error(err) // Custom error: Oops!
);
```

### Safe Value Extraction

```ts
const result = Result.success<number>(42);

console.log(result.getOrElse(-1)); // 42
console.log(result.getOrNull()); // 42
console.log(result.getOrThrow()); // 42

const failure = Result.failure<number>("Error occurred");

console.log(failure.getOrElse(-1)); // -1
console.log(failure.getOrNull()); // null
console.log(failure.getOrThrow()); // throws Error
```

---

## 🧠 API Reference

### Constructors

| Method                                  | Description                                 |
| --------------------------------------- | ------------------------------------------- |
| `Result.success<T, E>(value)`           | Creates a successful result                 |
| `Result.failure<T, E>(error)`           | Creates a failed result                     |
| `Result.fromThrowable<T, E>(fn, onErr)` | Wraps a function that may throw             |
| `Result.fromPromise<T, E>(fn, onErr)`   | Wraps an async function returning a promise |

### Instance Methods

| Method                        | Description                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| `.isSuccess()`                | Returns `true` if result is success                           |
| `.isFailure()`                | Returns `true` if result is failure                           |
| `.getOrNull()`                | Gets value or null                                            |
| `.getOrElse(defaultValue)`    | Gets value or default                                         |
| `.getOrThrow()`               | Gets value or throws error                                    |
| `.getFailureOrNull()`         | Gets error or null                                            |
| `.getError()`                 | Gets error (throws if not failure)                            |
| `.fold(onSuccess, onFailure)` | Apply one of two functions based on success/failure           |
| `.map(fn)`                    | Transforms the success value                                  |
| `.chain(fn)`                  | Chains another `Result` computation                           |
| `.flatten()`                  | Flattens nested `Result<Result<T, E>, E>` into `Result<T, E>` |
| `.ap(fnResult)`               | Applies a function inside a Result to current Result          |
| `.tap(fn)`                    | Executes side effect on success                               |
| `.tapError(fn)`               | Executes side effect on failure                               |
| `.mapError(fn)`               | Transforms the error value                                    |
| `.toJSON()`                   | Converts to plain object                                      |
| `.toString()`                 | String representation                                         |

---

## 🛡️ Type Safety

This library uses TypeScript generics to enforce correctness at compile time. For example:

```ts
const res: Result<number, string> = Result.success(42);
// res.map((x) => x.toString()) → Result<string, string>
```

If you attempt to do something invalid, TypeScript will prevent it.

---

## 🧪 Testing

Run tests using:

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

## 🧰 Development Setup

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

## 📄 License

MIT © [Em-Ant](https://github.com/Em-Ant)
