# 3. Object types, interfaces and type aliases

## 3.1 Declaring object shapes

```ts
// type alias
type User = {
  id: string;
  name: string;
  email?: string;          // optional
  readonly createdAt: Date; // immutable (shallowly)
};

// interface — same shape
interface User2 {
  id: string;
  name: string;
  email?: string;
  readonly createdAt: Date;
}
```

Members can be properties, methods, call signatures, construct signatures, index
signatures and getters/setters:

```ts
interface Repo<T> {
  // property
  readonly name: string;
  // method shorthand (bivariant params — see 4.7)
  find(id: string): T | undefined;
  // property with function type (strict params)
  save: (entity: T) => Promise<void>;
  // call signature — the object itself is callable
  (query: string): T[];
  // construct signature — the object is `new`-able
  new (name: string): Repo<T>;
  // index signature
  [key: `meta_${string}`]: unknown;
  // accessors (TS 4.3+ can have different get/set types)
  get size(): number;
  set size(value: number | string);
}
```

---

## 3.2 `interface` vs `type` — the real differences

They are interchangeable for plain object shapes. Five real differences:

**1. Declaration merging.** Interfaces with the same name in the same scope merge.
Type aliases collide.

```ts
interface Window { myApp: string }
interface Window { version: number }   // ✓ merged
// Window now has both

type T = { a: string };
type T = { b: string };   // ✗ Duplicate identifier 'T'
```

This is the mechanism behind [module augmentation](11-modules-declarations.md) —
adding `user` to Express's `Request`, or a global to `Window`.

**2. Only `type` can express non-object types.**

```ts
type Id = string | number;              // union
type Pair = [string, number];           // tuple
type Fn = (a: string) => void;          // function (interfaces can too, via call sig)
type Keys<T> = keyof T;                 // operators
type El<T> = T extends (infer U)[] ? U : never;   // conditional
type Getters<T> = { [K in keyof T]: () => T[K] }; // mapped
```

**3. Extension syntax and error timing.**

```ts
interface A { a: string }
interface B extends A { b: number }        // checked eagerly; better errors

type A2 = { a: string };
type B2 = A2 & { b: number };              // intersection; lazier
```

`extends` reports a conflict at the declaration; an intersection silently produces
`never` for the conflicting member and fails later at the use site:

```ts
interface X { a: string }
interface Y extends X { a: number }   // ✗ error right here

type X2 = { a: string };
type Y2 = X2 & { a: number };         // no error; Y2['a'] is never
const y: Y2 = { a: 1 };               // ✗ confusing error, far from the cause
```

**4. Performance.** Interfaces are cached by name and compared nominally-ish in the
checker's internal fast paths; large intersections of type aliases are recomputed. On
big codebases this is measurable. Use `interface` for object contracts.

**5. Implicit index signature.** A `type` alias for an object gets an implicit index
signature; an `interface` does not. This bites with `Record`:

```ts
type TA = { a: string };
interface IA { a: string }

declare function log(x: Record<string, unknown>): void;
declare const ta: TA;
declare const ia: IA;

log(ta);   // ✓
log(ia);   // ✗ Index signature for type 'string' is missing in type 'IA'
```

**Practical rule:** `interface` for object contracts that might be extended or
augmented; `type` for unions, tuples, functions and anything computed. Never argue that
one is "better".

---

## 3.3 Optional vs `| undefined`

Different, and the difference matters under `exactOptionalPropertyTypes`.

```ts
type A = { x?: string };            // key may be absent; value must be string if present
type B = { x: string | undefined }; // key MUST exist; value may be undefined

const a1: A = {};                    // ✓
const b1: B = {};                    // ✗ Property 'x' is missing
const b2: B = { x: undefined };      // ✓
```

Without `exactOptionalPropertyTypes`, `A` also accepts `{ x: undefined }`. With it on,
it does not:

```ts
// exactOptionalPropertyTypes: true
const a2: A = { x: undefined };   // ✗ undefined not assignable to string
const a3: A = { x: 'v' };         // ✓
```

Why care? Because `{}` and `{ x: undefined }` behave differently under `JSON.stringify`,
`Object.keys`, spread merging and `in`. Modelling "absent" and "explicitly cleared" as
the same thing is a real bug class.

```ts
type A2 = { x?: string | undefined };   // if you genuinely want both, say so
```

---

## 3.4 `readonly`

`readonly` is **shallow** and **compile-time only**.

```ts
type Config = { readonly name: string; readonly tags: string[] };
const c: Config = { name: 'a', tags: ['x'] };

c.name = 'b';        // ✗ Cannot assign to 'name'
c.tags.push('y');    // ✓ ALLOWED — readonly stops reassignment, not mutation
c.tags = [];         // ✗
```

For arrays, use `readonly T[]` (or `ReadonlyArray<T>`), which removes the mutating
methods:

```ts
const frozen: readonly string[] = ['x'];
frozen.push('y');    // ✗ Property 'push' does not exist on type 'readonly string[]'
const copy = [...frozen, 'y'];   // ✓ the immutable way
```

Assignability is one-directional:

```ts
const ok: readonly string[] = ['a'];   // mutable → readonly ✓
const bad: string[] = frozen;           // readonly → mutable ✗
```

**Take `readonly T[]` in every function parameter you do not mutate.** It costs
nothing, documents intent, and callers can pass either.

`readonly` does not affect assignability of *object properties*, which is a known
soundness hole:

```ts
type RO = { readonly a: string };
type RW = { a: string };
const ro: RO = { a: 'x' };
const rw: RW = ro;    // ✓ allowed! then rw.a = 'y' mutates the "readonly" object
```

---

## 3.5 Index signatures

```ts
type Dict = { [key: string]: number };
type ById = { [id: string]: User | undefined };   // honest version
type Nums = { [index: number]: string };
type Meta = { [K in `data-${string}`]: string };  // pattern index signature (TS 4.4)
```

The classic bug: an index signature claims *every* key exists.

```ts
const scores: { [k: string]: number } = { a: 1 };
scores.missing.toFixed();   // number per the type; undefined at runtime → 💥
```

Two fixes:

```ts
// (1) be honest in the type
const s1: { [k: string]: number | undefined } = { a: 1 };
s1.missing?.toFixed();   // ✓ forced to handle it

// (2) turn on noUncheckedIndexedAccess, which does (1) automatically
```

All named properties must conform to the index signature:

```ts
type Bad = { [k: string]: number; name: string };
// ✗ Property 'name' of type 'string' is not assignable to 'string' index type 'number'

type Good = { [k: string]: number | string; name: string };   // ✓
```

**`Record<K, V>` is the readable form**, and with a union key it is *exhaustive*, which
an index signature is not:

```ts
type Category = 'a' | 'b';
const icons: Record<Category, string> = { a: '1' };   // ✗ Property 'b' is missing
```

Use `Partial<Record<K, V>>` when keys are genuinely optional.

---

## 3.6 Excess property checking, in detail

See also [1.2](01-type-system-model.md#excess-property-checking--the-deliberate-exception).

```ts
type Opts = { debug?: boolean };

foo({ debugg: true });     // ✗ typo caught — object literal freshness
const o = { debugg: true };
foo(o);                    // ✓ no error — freshness lost
```

This is why "it works when I extract the variable" happens. The check exists only to
catch typos in literals; it is not part of assignability.

Ways freshness is lost: assignment to a variable, `as`, spread, a function call
returning it, and a union target where the key exists in any member.

To get a genuinely exact check, use `satisfies` or a helper:

```ts
const o2 = { debug: true } satisfies Opts;   // typos caught, types preserved
```

---

## 3.7 Tuples

Fixed-length, position-typed arrays.

```ts
type Pair = [string, number];
type Named = [name: string, age: number];        // labelled (docs + IDE only)
type WithOptional = [string, number?];            // length 1 or 2
type WithRest = [string, ...number[]];            // at least 1
type Leading = [...string[], number];             // trailing element typed (TS 4.2)
type RO = readonly [string, number];              // immutable

const p: Pair = ['a', 1];
p[0];        // string
p[2];        // ✗ Tuple type 'Pair' of length '2' has no element at index '2'
p.length;    // 2 — a literal type, not `number`
```

Tuples are how you type variadic functions and `useState`-style returns:

```ts
function useToggle(initial: boolean): [boolean, () => void] {
  let v = initial;
  return [v, () => { v = !v; }];
}
const [on, toggle] = useToggle(false);   // on: boolean, toggle: () => void
```

Without the tuple annotation, inference gives `(boolean | (() => void))[]` and
destructuring breaks. `as const` is the other way to get there.

---

## 3.8 `keyof`, indexed access, `typeof`

The three operators you use constantly.

```ts
type User = { id: string; age: number; tags: string[] };

type K = keyof User;              // 'id' | 'age' | 'tags'
type Age = User['age'];           // number
type IdOrAge = User['id' | 'age'];// string | number
type Values = User[keyof User];   // string | number | string[]
type Tag = User['tags'][number];  // string  ← indexing an array type
```

`keyof` on types with index signatures:

```ts
type D = { [k: string]: number };
type KD = keyof D;                // string | number  (numeric keys stringify!)
type KN = keyof { [k: number]: string };   // number
type KAny = keyof any;            // string | number | symbol
```

`typeof` in type position lifts a value into the type world:

```ts
const config = { port: 3000, features: ['a', 'b'] };
type Config = typeof config;                  // { port: number; features: string[] }
type Feature = (typeof config.features)[number];  // string

function f(a: string, b: number) { return { a, b }; }
type F = typeof f;                            // (a: string, b: number) => { a: string; b: number }
type R = ReturnType<typeof f>;                // { a: string; b: number }
type P = Parameters<typeof f>;                // [a: string, b: number]
```

`typeof` only works on identifiers and property accesses — not arbitrary expressions:

```ts
type Bad = typeof f();      // ✗ use ReturnType<typeof f>
```

---

## 3.9 Recursive object types

Type aliases may refer to themselves through object/array/function members:

```ts
type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

type TreeNode<T> = { value: T; children: TreeNode<T>[] };

// A directly self-referential alias is an error:
type Bad = Bad | string;   // ✗ Type alias 'Bad' circularly references itself
```

Recursive types are how you write `DeepReadonly`, `DeepPartial` and dotted-path
lookups — see [ch. 7](07-conditional-types.md) and [ch. 17](17-exercises.md).

---

## 3.10 Object type utilities you will write by hand

Preview of [ch. 9](09-utility-types.md), but these three come up constantly:

```ts
// only the keys whose values match a type
type PickByType<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };
type Strings = PickByType<{ a: string; b: number; c: string }, string>;  // { a: string; c: string }

// make some keys required, the rest untouched
type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// mutually exclusive object shapes ("either A or B, never both")
type XOR<A, B> =
  | (A & { [K in Exclude<keyof B, keyof A>]?: never })
  | (B & { [K in Exclude<keyof A, keyof B>]?: never });

type Auth = XOR<{ token: string }, { apiKey: string }>;
const a1: Auth = { token: 't' };                 // ✓
const a2: Auth = { token: 't', apiKey: 'k' };    // ✗
```

**Next:** [4. Functions →](04-functions.md)
