# 13. tsconfig and the compiler

## 13.1 A sane baseline

```jsonc
{
  "compilerOptions": {
    // --- output ---
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",   // "nodenext" for libraries / real Node
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // --- strictness ---
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,

    // --- interop / transpiler friendliness ---
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 13.2 What `strict` actually turns on

`"strict": true` is an umbrella for these — you can toggle them individually:

| Flag | Effect |
|---|---|
| `noImplicitAny` | Error when a parameter or variable would be implicitly `any`. |
| `strictNullChecks` | `null`/`undefined` are separate types, not members of every type. **The big one.** |
| `strictFunctionTypes` | Contravariant parameter checks — for function-type *properties*, not methods (see [4.7](04-functions.md#47-variance-the-senior-signal-topic)). |
| `strictBindCallApply` | `bind`/`call`/`apply` are checked against the signature. |
| `strictPropertyInitialization` | Class fields must be assigned in the constructor (or `!`). |
| `noImplicitThis` | Error on an implicitly-`any` `this`. |
| `alwaysStrict` | Emit `"use strict"`, parse in strict mode. |
| `useUnknownInCatchVariables` | `catch (e)` is `unknown`, not `any`. |
| `strictBuiltinIteratorReturn` | (5.6) Built-in iterators return `undefined`, not `any`, when done. |

---

## 13.3 The flags beyond `strict` that are worth the noise

### `noUncheckedIndexedAccess`

```ts
const xs = ['a', 'b'];
const first = xs[0];      // string | undefined
first.toUpperCase();      // ✗
first?.toUpperCase();     // ✓

const rec: Record<string, number> = {};
rec.missing.toFixed();    // ✗ — catches the index-signature lie
```

Noisy at first, and it does *not* narrow via `.length` checks — that is its main
irritation:

```ts
if (xs.length > 0) xs[0].toUpperCase();   // ✗ still errors
const [head] = xs;                        // also string | undefined
for (const x of xs) x.toUpperCase();      // ✓ iteration is fine
```

Worth it on new code; painful to retrofit onto a large array-heavy codebase.

### `exactOptionalPropertyTypes`

```ts
type Opts = { debug?: boolean };
const a: Opts = {};                   // ✓
const b: Opts = { debug: undefined }; // ✗ — "absent" ≠ "explicitly undefined"
const c: Opts = { debug: true };      // ✓

type Opts2 = { debug?: boolean | undefined };   // if you want both, say so
```

Matters because `{}` and `{ debug: undefined }` behave differently under
`Object.keys`, spread merging, `in` and `JSON.stringify`.

### `verbatimModuleSyntax`

Forces `import type` for type-only imports, and emits everything else verbatim. Kills
phantom runtime imports under esbuild/swc. Pairs with `isolatedModules`.

### `isolatedModules`

Guarantees every file can be transpiled independently — required by esbuild, swc, Babel
and Vite. Bans `const enum` across files, and re-exporting a type without `export type`.

### `noImplicitOverride`

Requires `override` on members that override a base member; catches the
rename-the-base-method refactoring bug.

### `skipLibCheck`

Skips type-checking `.d.ts` files. Almost everyone enables it — it hides conflicts
between third-party type packages that you cannot fix anyway, and it is a large
compile-time win. The cost: a genuinely broken `.d.ts` in your own published package
goes unnoticed, so check your own build output separately.

---

## 13.4 `target` and `lib`

`target` controls **downlevelling** (which syntax is emitted) *and* the default `lib`.
`lib` controls **which globals and methods exist in the type system**.

```jsonc
{
  "target": "ES2022",                    // emit modern syntax; no class-field downlevel
  "lib": ["ES2023", "DOM", "DOM.Iterable"]
}
```

Common mistakes:

```ts
// lib too low
[1, 2].at(-1);          // ✗ Property 'at' does not exist — needs ES2022
Object.groupBy(…);       // needs ESNext
structuredClone(…);      // needs DOM or Node types

// lib includes DOM in a Node project → `setTimeout` returns number instead of Timeout,
// and `fetch`/`document` type-check in files that will crash at runtime
```

For a Node-only package: `"lib": ["ES2023"]`, `"types": ["node"]`, no `DOM`.
For a browser package: include `DOM`, and do **not** include `@types/node`.

`useDefineForClassFields` (default true for ES2022+) changes class-field semantics to
`Object.defineProperty`, which matters for decorators and for fields that shadow
accessors:

```ts
class Base { get x() { return 1; } }
class Child extends Base { x = 2; }   // with defineForClassFields this SHADOWS the getter
```

---

## 13.5 Type-checking vs emitting

Most modern setups **do not use `tsc` to emit**. Vite/esbuild/swc strip types (fast, no
type checking) and `tsc --noEmit` runs as a separate check.

```jsonc
{ "compilerOptions": { "noEmit": true } }
```

```bash
tsc --noEmit            # type-check only
tsc --noEmit --watch    # in a terminal alongside the dev server
tsc -b                  # build with project references
```

The trap: **your bundler does not type-check**. A build passing does not mean the types
are sound. Put `tsc --noEmit` in CI, always.

---

## 13.6 Performance

```bash
tsc --noEmit --diagnostics          # instantiation counts, memory, timings
tsc --noEmit --extendedDiagnostics
tsc --noEmit --generateTrace trace/ # then open in edge://tracing or Perfetto
tsc --noEmit --listFiles            # what got pulled in — usually the surprise
```

The usual culprits, in order:

1. **Too many files in the program.** Check `--listFiles`; a stray `include` pulling in
   `node_modules` or test fixtures is common.
2. **Deep recursive conditional types** instantiated at many call sites. Alias the
   result once (`type Draft = DeepPartial<Schema>`) instead of recomputing.
3. **Giant unions and template-literal cross-products.**
4. **Large intersection chains** instead of `interface extends`.
5. **Missing `skipLibCheck`.**
6. **No incremental build.** `"incremental": true` plus a stable `tsBuildInfoFile`.

Two annotations that help the checker: explicit return types on exported functions
(stops it inferring across module boundaries) and `interface` instead of long
intersection aliases.

---

## 13.7 Structuring a monorepo

Three layers, which is what this repo uses:

```jsonc
// tsconfig.base.json — shared options
{ "compilerOptions": { "strict": true, "target": "ES2022", … } }

// packages/core/tsconfig.json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" } }

// apps/react-lab/tsconfig.json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "jsx": "react-jsx", "noEmit": true } }
```

Add `references` + `composite: true` when whole-repo checking gets slow
([11.9](11-modules-declarations.md#119-project-references-monorepos)).

Per-app `lib`/`types` differences are the point of splitting: `nest-api` wants
`["node"]` and no DOM; `react-lab` wants DOM and no Node globals.

---

## 13.8 Every flag worth knowing, grouped

**Type checking**
`strict` (+ the 9 above), `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`,
`noPropertyAccessFromIndexSignature`, `noUncheckedSideEffectImports` (5.6),
`allowUnusedLabels`, `allowUnreachableCode`

**Modules**
`module`, `moduleResolution`, `baseUrl`, `paths`, `rootDirs`, `resolveJsonModule`,
`allowImportingTsExtensions`, `moduleDetection`, `verbatimModuleSyntax`,
`isolatedModules`, `esModuleInterop`, `allowSyntheticDefaultImports`,
`customConditions`, `rewriteRelativeImportExtensions` (5.7)

**Emit**
`target`, `lib`, `outDir`, `rootDir`, `declaration`, `declarationMap`, `sourceMap`,
`inlineSources`, `removeComments`, `importHelpers` (+ `tslib`), `downlevelIteration`,
`emitDecoratorMetadata`, `experimentalDecorators`, `jsx`, `jsxImportSource`,
`useDefineForClassFields`, `erasableSyntaxOnly` (5.8), `noEmit`, `noEmitOnError`

**Interop / JS**
`allowJs`, `checkJs`, `maxNodeModuleJsDepth`

**Projects**
`composite`, `incremental`, `tsBuildInfoFile`, `disableSourceOfProjectReferenceRedirect`

**Editor / diagnostics**
`skipLibCheck`, `pretty`, `noErrorTruncation`, `explainFiles`, `traceResolution`

Two worth calling out that people miss:

```ts
// noPropertyAccessFromIndexSignature: force bracket access for index-signature keys,
// so real properties and dynamic keys look different at the call site
const env: { NODE_ENV: string; [k: string]: string } = process.env as any;
env.NODE_ENV;    // ✓ declared property
env.CUSTOM;      // ✗ must write env['CUSTOM']

// erasableSyntaxOnly (5.8): bans enums, namespaces with values, and parameter
// properties — the syntaxes Node's native type stripping cannot handle.
```

**Next:** [14. Patterns and recipes →](14-patterns-recipes.md)
