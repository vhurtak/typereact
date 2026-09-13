# 15. Reading TypeScript errors

## 15.1 How to read any TS error

A TypeScript error is a **proof trace**, printed outside-in. Read it in three steps:

1. **The first line** is the top-level claim: `X is not assignable to Y`.
2. **The indented lines** are the path the checker took to find the mismatch. The
   *last* one is where the actual disagreement is.
3. **Ignore the middle.** It is bookkeeping.

```
Argument of type '{ id: string; tags: string[] }' is not assignable to
  parameter of type 'Product'.
  Types of property 'tags' are incompatible.
    Type 'string[]' is not assignable to type 'readonly [string, string]'.
      Target requires 2 element(s) but source may have fewer.
```

Only the last line matters: your array is not a 2-tuple.

Useful settings while debugging:

```bash
tsc --noEmit --noErrorTruncation      # stop the "..." in long types
tsc --noEmit --pretty false           # machine-readable, greppable
```

And the debugging trick — force the compiler to print a type:

```ts
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type Debug = Expand<SomeComplicatedType>;   // hover it

// or trigger a deliberate error that prints the type
const _debug: never = someValue;   // "Type 'X' is not assignable to type 'never'"
```

---

## 15.2 The errors you will actually hit

### TS2322 — `Type 'X' is not assignable to type 'Y'`

The generic assignability failure. Read the indented trace to find the property.

```ts
const n: number = '1';   // Type 'string' is not assignable to type 'number'
```

Common non-obvious causes: literal widening (`{ m: string }` vs `'GET' | 'POST'` —
[2.3](02-primitives-literals-widening.md#23-widening-the-rule-people-trip-over)),
readonly→mutable, and a union that lost a member.

### TS2345 — `Argument of type 'X' is not assignable to parameter of type 'Y'`

Same as 2322, at a call site.

### TS2339 — `Property 'x' does not exist on type 'Y'`

Either a typo, or **you are holding a union** and the property exists only in some
members. Narrow first.

```ts
declare const v: string | number;
v.toUpperCase();   // ✗ 2339 — narrow with typeof first
```

If `Y` is `never`, you narrowed too far — usually an impossible `if` chain.

### TS2532 / TS18048 — `Object is possibly 'undefined'` / `'x' is possibly 'undefined'`

`strictNullChecks` or `noUncheckedIndexedAccess` doing its job.

```ts
const first = arr[0];
first.toUpperCase();     // ✗
first?.toUpperCase();    // ✓
if (first) first.toUpperCase();          // ✓
const [head = 'default'] = arr;          // ✓ default
```

Do not reach for `!` — narrow, or restructure so the value cannot be missing.

### TS2531 / TS18047 — `Object is possibly 'null'`

Same, for `null`. Classic source: `document.getElementById`.

### TS2367 — `This comparison appears unintentional because the types have no overlap`

```ts
declare const s: 'a' | 'b';
if (s === 'c') {}   // ✗ — usually a stale literal after a rename
```

Often a *real* bug: the union changed and this branch is now dead.

### TS2739 / TS2741 — `Type 'X' is missing the following properties from type 'Y'`

You built a partial object. Either complete it, or the target should be `Partial<Y>`.

### TS2353 / TS2561 — `Object literal may only specify known properties`

[Excess property checking](03-objects-interfaces-types.md#36-excess-property-checking-in-detail).
2561 helpfully suggests the intended key (`'debugg' does not exist... Did you mean 'debug'?`).

### TS7006 — `Parameter 'x' implicitly has an 'any' type`

No contextual type available. Annotate it, or give the surrounding function a type so
contextual typing kicks in. Note `implements` does **not** provide contextual typing
([10.2](10-classes.md#102-implements-vs-extends)).

### TS7053 — `Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'X'`

Indexing an object with a non-literal string.

```ts
const obj = { a: 1, b: 2 };
declare const key: string;
obj[key];                              // ✗ 7053
obj[key as keyof typeof obj];          // works, but asserts
if (key in obj) obj[key as keyof typeof obj];   // ✓ guarded
```

The clean fix is to type the object as `Record<string, number>` if the keys are truly
dynamic, or to keep the key literal-typed:

```ts
function get<T extends object, K extends keyof T>(o: T, k: K): T[K] { return o[k]; }
```

### TS2589 — `Type instantiation is excessively deep and possibly infinite`

A recursive conditional/mapped type exceeded the depth cap. Rewrite in tail-recursive
accumulator form, or bound the depth
([7.5](07-conditional-types.md#75-recursion-limits-and-tail-recursion)).

### TS2590 — `Expression produces a union type that is too complex to represent`

A cross-product blew up (template literal types, or nested unions). Flatten the model,
or replace the union with a branded string.

### TS2769 — `No overload matches this call`

Read the *last* overload's error, not the first. If the argument is a union, remember
overloads do not accept unions
([4.4](04-functions.md#when-not-to-overload)) — a generic may be the right fix.

### TS2416 — `Property 'x' in type 'Child' is not assignable to the same property in base type 'Base'`

An override changed the signature incompatibly. Check parameter variance.

### TS2564 — `Property 'x' has no initializer and is not definitely assigned in the constructor`

`strictPropertyInitialization`. Fix by initialising, making it optional, or `!` when a
framework assigns it (DI, lifecycle hooks).

### TS2749 — `'X' refers to a value, but is being used as a type`

Use `typeof X` for a value's type, or `InstanceType<typeof X>` for a class instance.

### TS2693 — `'X' only refers to a type, but is being used as a value`

The reverse: you tried to use a `type`/`interface` at runtime. See
[1.1](01-type-system-model.md#11-erasure).

### TS1361 / TS1362 — `'X' cannot be used as a value because it was imported using 'import type'`

Drop the `type` modifier for that import, or split the import statement.

### TS2307 — `Cannot find module 'x' or its corresponding type declarations`

Either the package genuinely has no types (install `@types/x`, or write a
[`.d.ts`](11-modules-declarations.md#115-declaration-files-dts)), or your
`moduleResolution` cannot see its `exports` map (`bundler`/`nodenext` vs `node10`), or
a `paths` alias is missing from the bundler config.

### TS2688 — `Cannot find type definition file for 'x'`

A stale entry in `compilerOptions.types` or `typeRoots`.

### TS18046 — `'e' is of type 'unknown'`

`useUnknownInCatchVariables`. Narrow with `instanceof Error`.

### TS2304 — `Cannot find name 'x'`

Missing `lib` (e.g. `structuredClone` without DOM), missing `types` (e.g. `process`
without `@types/node`), or a global that needs an ambient declaration.

### TS2554 — `Expected N arguments, but got M`

Note the asymmetry: **fewer** parameters in a callback is fine, more is not
([4.2](04-functions.md#42-parameters-optional-default-rest)).

---

## 15.3 The five most common root causes

Whatever the error number, the underlying cause is usually one of these:

1. **Widening.** A literal became `string` because it sat in a mutable position. Fix
   with `as const` or `satisfies`.
2. **A union you forgot to narrow.** The property exists in only some members.
3. **`readonly` / variance direction.** `readonly T[]` → `T[]` is rejected; a
   `(a: Animal) => void` cannot stand in for `(d: Dog) => void`.
4. **A generic parameter is not its constraint** inside the function body
   ([6.2](06-generics.md#62-constraints)).
5. **Config mismatch.** The editor uses a different `tsconfig.json` than the build, or
   `paths` exist in tsconfig but not in the bundler.

---

## 15.4 When you genuinely need an escape hatch

In order of preference:

```ts
// 1. narrow — always try this first
if (typeof x === 'string') …

// 2. a type guard, at a boundary you control
function isUser(x: unknown): x is User { … }

// 3. satisfies, to check without widening
const c = { … } satisfies Config;

// 4. a single, commented assertion
// SAFE: the schema above guarantees `data` is present when ok === true
const data = res.data as User;

// 5. @ts-expect-error with a reason — better than @ts-ignore, because it ERRORS
//    if the underlying problem is fixed and the directive becomes unnecessary
// @ts-expect-error upstream types are wrong; see DefinitelyTyped#12345
legacy.doThing(1, 2, 3);

// 6. any — last resort, in a named, isolated adapter function
```

Never use `@ts-ignore`: it silently survives the fix. `@ts-expect-error` is
self-cleaning, which is exactly why the companion example files in this handbook use it
as a test harness.

**Next:** [16. Framework typing →](16-framework-typing.md)
