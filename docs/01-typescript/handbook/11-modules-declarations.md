# 11. Modules, declaration files, augmentation

## 11.1 Modules vs scripts

A file with a top-level `import` or `export` is a **module**; its declarations are
scoped to it. A file without either is a **script**, and everything in it is global.

```ts
// module — `x` is private to this file
export const x = 1;

// script — `y` is global and collides across the project
const y = 1;
```

To make a file a module without exporting anything:

```ts
export {};
```

You will need this in `.d.ts` files and in test setup files that only augment globals.

---

## 11.2 Import and export forms

```ts
// named
export const a = 1;
export function f() {}
export { a as alias };
import { a, f } from './m';
import { a as renamed } from './m';

// default
export default class Foo {}
import Foo from './m';

// namespace
import * as m from './m';
export * from './m';
export * as m from './m';   // re-export as a namespace

// side-effect only
import './polyfills';

// type-only (erased entirely)
import type { User } from './types';
import { type User, createUser } from './types';   // inline type modifier
export type { User };
```

**`import type` matters** because single-file transpilers (esbuild, swc, Vite, Babel)
cannot see whether an import is a type. Without it, they emit a runtime import of a
module that may only contain types — a phantom dependency, a broken bundle, or a
circular-import crash.

`verbatimModuleSyntax: true` enforces the discipline: any import not marked `type` is
emitted verbatim, and any marked `type` is dropped.

```ts
// with verbatimModuleSyntax
import { User } from './types';        // ✗ if User is a type-only export
import type { User } from './types';   // ✓
```

---

## 11.3 Module resolution

The `moduleResolution` values you will meet:

| Value | Use for |
|---|---|
| `bundler` | Vite/webpack/esbuild projects. Supports `exports`, no extension required. **Default choice for apps.** |
| `node16` / `nodenext` | Real Node. Enforces file extensions in ESM and the `exports` map strictly. **Default choice for libraries.** |
| `node10` (`node`) | Legacy CommonJS lookup. Avoid in new projects. |

Under `nodenext`, a package's `type` field decides how each file is interpreted, and
relative ESM imports need the extension:

```ts
// package.json: { "type": "module" }
import { helper } from './helper.js';   // ✓ note: .js, even though the source is .ts
import { helper } from './helper';      // ✗ under nodenext
```

The `.js` extension is correct: you are importing the *output* path. TS resolves it to
`helper.ts` for checking.

### Dual-package exports

This is the shape `@lab/core` uses to serve both ESM and CJS consumers:

```json
{
  "name": "@lab/core",
  "type": "module",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist-cjs/index.js"
    }
  }
}
```

Rules: `types` must come **first** in each condition block, and a CJS build directory
needs its own `package.json` with `{"type":"commonjs"}` (that is what
`scripts/write-cjs-package.mjs` does).

### Path aliases

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@app/*": ["src/*"], "@lab/core": ["../../packages/core/src/index.ts"] }
  }
}
```

`paths` only affects **type resolution**. The bundler or runtime needs the same mapping
(`vite.config.ts` `resolve.alias`, `tsconfig-paths`, or `imports` in package.json).
Mismatch here is the single most common "works in the editor, fails at build" bug.

Node-native alternative, no tooling required:

```json
{ "imports": { "#core/*": "./src/core/*.js" } }
```

---

## 11.4 CommonJS interop

```ts
// TS-specific export-assignment form, for CJS modules
export = someFunction;
import fn = require('./m');

// with esModuleInterop (recommended, on by default in most setups)
import fn from './m';           // default-imports a CJS module.exports
import * as ns from './m';      // ✗ under esModuleInterop: cannot call a namespace
```

`esModuleInterop` inserts `__importDefault`/`__importStar` helpers so
`module.exports = fn` can be default-imported. `allowSyntheticDefaultImports` only
silences the type error without emitting the helper — use the real flag.

Under `nodenext`, TS also checks `require` vs `import` per file extension:

```
.mts / .mjs → always ESM
.cts / .cjs → always CJS
.ts  / .js  → decided by the nearest package.json "type"
```

---

## 11.5 Declaration files (`.d.ts`)

A `.d.ts` file contains types only — no implementations, and nothing is emitted.

```ts
// types/legacy-lib.d.ts
declare module 'legacy-lib' {
  export interface Options { debug?: boolean }
  export function init(options?: Options): void;
  const version: string;
  export default version;
}
```

Ambient declarations for globals introduced by a script tag or a bundler define:

```ts
// globals.d.ts
declare const __APP_VERSION__: string;
declare function gtag(command: 'event', name: string, params?: object): void;

interface Window {
  dataLayer: unknown[];
  __REDUX_DEVTOOLS_EXTENSION__?: () => unknown;
}
```

Non-code imports handled by a bundler:

```ts
declare module '*.svg' {
  const content: string;
  export default content;
}
declare module '*.css';
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
```

(Vite ships these in `vite/client`; add `"types": ["vite/client"]` instead of writing
them yourself.)

Where TS looks for types, in order: the package's `types`/`typings` field, `exports`
`types` condition, a bundled `index.d.ts`, then `@types/<pkg>` in `node_modules/@types`
(controlled by `typeRoots` and `types`).

Generate your own with `"declaration": true` (plus `declarationMap` so editors can jump
to the `.ts` source instead of the `.d.ts`).

---

## 11.6 Declaration merging

Interfaces, namespaces, enums and classes merge with themselves and with each other.

```ts
// interface + interface
interface Box { width: number }
interface Box { height: number }
const b: Box = { width: 1, height: 2 };   // ✓ merged

// namespace + function — attach properties to a function
function counter() { return counter.count++; }
namespace counter { export let count = 0; }
counter(); counter.count;   // ✓ both typed

// namespace + class — nested types under a class name
class Album {}
namespace Album { export interface Track { title: string } }
const t: Album.Track = { title: 'x' };

// namespace + enum
enum Color { Red }
namespace Color { export function parse(s: string): Color { return Color.Red; } }
```

Merge rules: non-function members must be identical across declarations; function
members are added as overloads, with **later declarations first** in resolution order.

---

## 11.7 Module augmentation — the real-world use

Add members to a module you do not own. The augmentation must be in a module file
(i.e. one with a top-level import/export).

```ts
// express.d.ts — add `user` to Express's Request, as nest-api does
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; roles: string[] };
  }
}
```

```ts
// augment a global
export {};
declare global {
  interface Window { analytics?: { track(e: string): void } }
  interface Array<T> { last(): T | undefined }
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}
```

That `ProcessEnv` augmentation is worth doing in every Node project: `process.env.PORT`
becomes typed and typo-checked.

Framework examples you will meet:

```ts
// React — extend the CSS properties allowed in `style`
declare module 'react' {
  interface CSSProperties { [key: `--${string}`]: string | number }
}

// Vitest / Jest — custom matchers
declare module 'vitest' {
  interface Assertion<T> { toBeWithin(min: number, max: number): T }
}
```

**Rules:** you can add new members; you cannot change an existing member's type, and
you cannot add a new top-level default export.

---

## 11.8 Namespaces (legacy)

```ts
namespace Validation {
  export interface Validator { isValid(s: string): boolean }
  const re = /^[A-Za-z]+$/;                  // private to the namespace
  export class Letters implements Validator {
    isValid(s: string) { return re.test(s); }
  }
}
const v = new Validation.Letters();
```

Namespaces predate ES modules and emit an IIFE. **Do not use them for code
organisation** — use files and modules. They remain legitimate for:

- grouping types inside a `.d.ts` (`declare namespace NodeJS { … }`)
- merging types onto a function or class (11.6)

`import x = require(…)` and `export = x` are the same era; keep them for CJS interop
only.

---

## 11.9 Project references (monorepos)

```json
// packages/core/tsconfig.json
{ "compilerOptions": { "composite": true, "declaration": true, "declarationMap": true } }

// apps/react-lab/tsconfig.json
{ "references": [{ "path": "../../packages/core" }] }
```

Then `tsc --build` (`tsc -b`) builds dependencies in order, incrementally, and skips
unchanged projects using `.tsbuildinfo`. `composite: true` implies `declaration: true`
and requires every input to be listed in `include`/`files`.

The alternative in this repo is simpler and works fine at small scale: build `@lab/core`
to `dist/` and consume it as a normal workspace dependency. Project references pay off
once type-checking the whole monorepo takes more than a few seconds.

**Next:** [12. Async, promises, iterators →](12-async-iterators.md)
