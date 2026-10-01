# Changelog

All notable changes to this project are documented here. This project does not yet follow strict semantic versioning while in `0.0.x`; entries mark behavior changes explicitly.

## 0.0.4

### Fixed

- `getError()` now throws `Error("[Result]: Error expected.")` on success instead of returning a dummy `Error` cast to `E`.
- `package.json` `module` field now points to `dist/index.js`, matching the actual `tsup` ESM output (was `dist/index.mjs`, which was never emitted).
- Default `onErr` mappers in `fromThrowable` / `fromPromise` stringify object rejections via JSON instead of producing `"[object Object]"`.
- `safeStringify` now falls back to `String(x)` when `JSON.stringify` returns `undefined`.
- `fromPromise` is now `async` and captures synchronous thunk throws as failures instead of throwing synchronously.

### Added

- `Result.all` with fail-fast semantics (first failure wins, values in order, `[]` returns `success([])`). Tuple input preserves tuple types.
- `getOrThrow(mapErr)` overload to wrap non-`Error` failures into `Error` at the boundary. Default behavior (rethrow raw failure) is unchanged.
- `getOrElseGet(fn)` lazy variant of `getOrElse`.
- `mapAsync` / `chainAsync` for `Promise<Result>` pipelines. Short-circuit on failure; async rejections propagate.
- `isSuccess` / `isFailure` type predicates (`Result<T, never>` / `Result<never, E>`).
- `fromPromise` accepts a direct `Promise<T>` in addition to a `() => Promise<T>` thunk.
- `prepublishOnly` script (`typecheck`, `lint`, `vitest run --coverage`, `build`).
- Per-condition `exports` types (`import` uses `index.d.ts`, `require` uses `index.d.cts`).
- `"sideEffects": false`.

### Changed

- `tsconfig` uses `moduleResolution: bundler` and `isolatedModules: true`. Editor and bundler resolution only, no runtime change.
- Internal cleanup with no API change: shared default error mapper, named error constant, allocation-free `Result.all`.
- `README` rewritten without emojis and updated to document the full API.
