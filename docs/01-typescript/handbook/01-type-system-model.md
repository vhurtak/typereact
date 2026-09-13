# 1. The type system model

Everything in TypeScript follows from four facts. Learn these and most "weird TS
behaviour" stops being weird.

1. Types are **erased** — they do not exist at runtime.
2. Typing is **structural** — a type is a shape, not a name.
3. Types are **sets of values**, and assignability is **subset-ness**.
4. The checker is **gradual** — `any` is an explicit hole in the system.

---

## 1.1 Erasure

TypeScript compiles to JavaScript by *deleting* the types. No metadata, no runtime
representation, no reflection.

```ts
type User = { name: string };
interface Admin { level: number }

const u: User = { name: 'a' };
```

compiles to:

```js
const u = { name: 'a' };
```

Consequences that trip people up:

```ts
type User = { name: string };

const x = User;              // ✗ 'User' only refers to a type, but is being used as a value
const y = typeof User;       // ✗ same
if (u instanceof User) {}    // ✗ User is not a constructor
```

There is no way to ask "is this value a `User`?" without writing the check yourself.
That is the entire reason [type guards](05-unions-narrowing.md) exist.

**What is NOT erased:** `enum`, `class`, `namespace` with a body, and parameter
properties emit real JavaScript. Everything else (`type`, `interface`, type
annotations, generics, `as`, `satisfies`, `declare`) vanishes.

```ts
enum Level { Low, High }     // emits an object at runtime
class Box { constructor(public value: number) {} }  // emits a class + assignment
```

The `isolatedModules` and `verbatimModuleSyntax` flags exist because single-file
transpilers (esbuild, swc, Babel) cannot see across files to know whether an import is
a type or a value — so you must say:

```ts
import type { User } from './user';   // erased entirely
import { createUser } from './user';  // kept
```

### The declaration space split

A name can live in the **type space**, the **value space**, or both.

| Declaration | Type space | Value space |
|---|---|---|
| `type X = …` | ✓ | ✗ |
| `interface X {}` | ✓ | ✗ |
| `const x = …` | ✗ | ✓ |
| `function f() {}` | ✗ | ✓ |
| `class C {}` | ✓ (instance type) | ✓ (constructor) |
| `enum E {}` | ✓ | ✓ |
| `namespace N {}` | ✓ | ✓ (if it has a value member) |

`typeof` is the bridge from value space to type space:

```ts
const config = { port: 3000, host: 'localhost' };
type Config = typeof config;         // { port: number; host: string }

class Box {}
type Instance = Box;                 // the instance type
type Ctor = typeof Box;              // the constructor: new () => Box
```

---

## 1.2 Structural typing

Two types with the same members are the same type. Names are documentation.

```ts
type Point2D = { x: number; y: number };
type Vector2 = { x: number; y: number };

const p: Point2D = { x: 1, y: 2 };
const v: Vector2 = p;   // ✓ identical shape
```

This is different from Java/C#/Rust, where a `Point2D` is a `Point2D` because it was
declared as one. TypeScript is structural because JavaScript is: at runtime nothing
distinguishes those two objects.

A class is *also* just a shape:

```ts
class Dog { constructor(public name: string) {} }
class Cat { constructor(public name: string) {} }

const d: Dog = new Cat('whiskers');   // ✓ same shape. No error.
```

Add a private member and it becomes effectively nominal, because privates are compared
by *declaration identity*, not by name:

```ts
class Dog { private brand!: void; constructor(public name: string) {} }
class Cat { private brand!: void; constructor(public name: string) {} }

const d2: Dog = new Cat('whiskers');
// ✗ Types have separate declarations of a private property 'brand'
```

### Excess property checking — the deliberate exception

Structural typing says "extra properties are fine". But a *fresh object literal*
assigned directly to a typed target gets an extra check, because an unknown key in a
literal is almost always a typo.

```ts
type Named = { name: string };

const dog = { name: 'Rex', legs: 4 };
const a: Named = dog;                      // ✓ via a variable — plain structural rules
const b: Named = { name: 'Rex', legs: 4 }; // ✗ 'legs' does not exist in type 'Named'
```

The check is *freshness*-based, and freshness is lost on assignment to a variable, on
a type assertion, and on a spread:

```ts
const c: Named = { name: 'Rex', legs: 4 } as Named;   // ✓ (assertion kills freshness)
const d: Named = { ...{ name: 'Rex', legs: 4 } };      // ✓ (spread kills freshness)
```

Excess property checking against a **union** target passes if the property exists in
*any* member — a common source of surprise:

```ts
type A = { a: string };
type B = { b: string };
const ab: A | B = { a: 'x', b: 'y' };   // ✓ — each key exists in some member
```

---

## 1.3 Types are sets; assignability is subset-ness

This is the mental model that makes `never`, `unknown`, unions and intersections
obvious instead of magical.

| Type | The set it denotes |
|---|---|
| `never` | {} — empty |
| `undefined` | { undefined } |
| `'a'` | { 'a' } |
| `boolean` | { true, false } |
| `string` | all strings |
| `{ a: string }` | all objects with an `a: string` |
| `unknown` | every value |
| `any` | (not a set — see 1.4) |

**`S` is assignable to `T` iff `S` ⊆ `T`.**

```ts
const s: string = 'a';       // ✓ {'a'} ⊆ string
const l: 'a' = 'a';
const bad: 'a' = s;          // ✗ string ⊄ {'a'}
```

**Union `A | B` is set union.** Its members are the values in either set, so the
*operations* you can perform shrink to those valid for both.

```ts
type Id = string | number;
declare const id: Id;
id.toUpperCase();   // ✗ not on number
id.toString();      // ✓ on both
```

**Intersection `A & B` is set intersection.** For object types this means *more*
members (an object with both shapes), which feels backwards until you think in sets:
the set of objects having both shapes is smaller.

```ts
type WithId = { id: string };
type WithName = { name: string };
type Both = WithId & WithName;   // { id: string; name: string }

type Impossible = string & number;   // never — no value is in both sets
```

`never` is the identity for union (`T | never` = `T`) and the absorbing element for
intersection (`T & never` = `never`). `unknown` is the reverse: `T | unknown` =
`unknown`, `T & unknown` = `T`.

### Where the set model leaks

Two places worth knowing, because they are the source of "TypeScript is unsound"
complaints:

**Object types are not exact.** `{ a: string }` denotes objects with *at least* `a`.
There is no exact-object type in TypeScript (excess property checking is a lint, not a
type).

**Arrays and object properties are covariant**, which is unsound but pragmatic:

```ts
type Animal = { name: string };
type Dog = { name: string; bark(): void };

const dogs: Dog[] = [{ name: 'a', bark() {} }];
const animals: Animal[] = dogs;      // ✓ allowed
animals.push({ name: 'cat' });       // ✓ allowed — dogs now contains a non-Dog
dogs[1].bark();                      // 💥 runtime TypeError
```

TypeScript accepts this deliberately: the sound alternative (invariant arrays) makes
everyday code unbearable. Know it, and prefer `readonly T[]` in signatures, which is
covariant *and* safe because you cannot push.

---

## 1.4 `any`, `unknown`, `never`

### `any` — the escape hatch

`any` is not a set. It is a *suspension of checking*, assignable **to** everything and
**from** everything, which is why it is contagious.

```ts
const raw: any = JSON.parse('{}');
const n: number = raw;     // ✓ no error
const s: string = raw;     // ✓ no error, contradictory, both compile
raw.a.b.c();               // ✓ no error → runtime crash
```

One `any` in a chain silently disables checking for everything downstream. Prefer
`unknown` at every boundary you do not control; use `any` only inside a narrow,
commented, well-tested adapter.

### `unknown` — the honest top type

Holds anything; permits nothing until you narrow.

```ts
function len(x: unknown): number {
  x.length;                            // ✗ 'x' is of type 'unknown'
  if (typeof x === 'string') return x.length;   // ✓ narrowed
  if (Array.isArray(x)) return x.length;        // ✓ narrowed to any[]
  return 0;
}
```

Assignability: everything → `unknown` ✓ ; `unknown` → anything except `unknown`/`any` ✗.

This is what `catch` should be, and since TS 4.4 you can enforce it globally with
`useUnknownInCatchVariables` (included in `strict`):

```ts
try { risky(); }
catch (e) {              // e: unknown
  const message = e instanceof Error ? e.message : String(e);
}
```

### `never` — the bottom type

The empty set. No value has it, so:

- Nothing is assignable **to** `never` (except `never` itself).
- `never` is assignable **from** nothing but assignable **to** everything (vacuously).

Its four practical jobs:

```ts
// (1) functions that never return normally
function fail(msg: string): never { throw new Error(msg); }
function loop(): never { while (true) {} }

// (2) exhaustiveness checking
type Shape = { kind: 'circle' } | { kind: 'square' };
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return 1;
    case 'square': return 2;
    default: return assertNever(s);   // s: never — all cases handled
  }
}
function assertNever(x: never): never { throw new Error(`Unexpected: ${JSON.stringify(x)}`); }

// (3) filtering in conditional types (see ch. 7) — `never` disappears from unions
type NonNullableish<T> = T extends null | undefined ? never : T;

// (4) marking impossible states
type Result<T, E = never> = { ok: true; value: T } | { ok: false; error: E };
// Result<number> can never be the error branch, and TS knows it.
```

A subtle one: `never` in a union vanishes, so a conditional type returning `never`
acts as a *filter*:

```ts
type Keep = ('a' | 'b' | 'c') extends infer U ? U : never;
type OnlyStrings<T> = T extends string ? T : never;
type R = OnlyStrings<'a' | 1 | 'b'>;   // 'a' | 'b'
```

---

## 1.5 `void`, `undefined`, `null`

`void` means "the return value should be ignored", not "returns undefined".

```ts
function f(): void {}
const r = f();          // r: void — you may not use it meaningfully
```

The important special rule: a function returning something **is assignable** to a
`void`-returning signature. This is what makes `array.forEach(x => arr.push(x))` legal.

```ts
type Handler = () => void;
const h: Handler = () => 42;   // ✓ allowed; the 42 is just discarded
```

That rule is scoped to *assignability*, not to direct calls:

```ts
function g(): void { return 42; }   // ✗ direct return type mismatch
```

Under `strictNullChecks` (on with `strict`), `null` and `undefined` are their own
types and are not members of every other type:

```ts
let s: string = null;          // ✗
let s2: string | null = null;  // ✓
```

Optional parameters/properties add `undefined`, not `null`:

```ts
function f2(a?: string) {}     // a: string | undefined
type O = { a?: string };       // a: string | undefined (see exactOptionalPropertyTypes, ch. 13)
```

---

## 1.6 Gradual typing and where types come from

Three sources, in priority order:

1. **Annotation** — you wrote it: `const a: string = …`
2. **Inference** — TS computed it from the initialiser or the return expression.
3. **`any`** — inference failed and `noImplicitAny` is off.

Prefer inference for locals, annotation for **public API boundaries**:

```ts
// ✓ inferred: less noise, still fully typed
const users = rows.map((r) => ({ id: r.id, name: r.name }));

// ✓ annotated: errors point at the definition, not at every call site
export function parseUser(raw: unknown): Result<User, ParseError> { … }
```

A missing return type on an exported function means a change to its body silently
changes its public type, and the error surfaces in a consumer file. Annotate exports.

---

## 1.7 Quick reference

```ts
// assignability, in one block
declare let anyV: any, unknownV: unknown, neverV: never, voidV: void, str: string;

unknownV = str;      // ✓ everything → unknown
str = unknownV;      // ✗ unknown → T requires narrowing
str = anyV;          // ✓ any → everything
anyV = str;          // ✓ everything → any
str = neverV;        // ✓ never → everything
neverV = str;        // ✗ nothing → never
voidV = undefined;   // ✓
str = voidV;         // ✗
```

**Companion file:** [`../examples/01-foundations.ts`](../examples/01-foundations.ts) —
compiler-verified version of this chapter.
