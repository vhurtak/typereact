# 17. Exercises, with solutions

Do these on paper or in the playground before reading the solutions. Difficulty:
🟢 warm-up · 🟡 interview-level · 🔴 type-level programming.

---

## 🟢 1. `ElementOf`

Extract the element type of an array.

<details><summary>Solution</summary>

```ts
type ElementOf<T> = T extends readonly (infer U)[] ? U : never;

type A = ElementOf<string[]>;          // string
type B = ElementOf<readonly [1, 2]>;   // 1 | 2
```
Use `readonly` in the pattern so it matches both mutable and readonly arrays.
</details>

---

## 🟢 2. `Mutable<T>`

Remove `readonly` from every property.

<details><summary>Solution</summary>

```ts
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
```
</details>

---

## 🟡 3. `DeepReadonly<T>`

Recurse through objects and arrays; leave functions alone.

<details><summary>Solution</summary>

```ts
type DeepReadonly<T> =
  T extends (...args: any[]) => any ? T
  : T extends readonly (infer U)[] ? ReadonlyArray<DeepReadonly<U>>
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
```
Order matters: functions and arrays are objects, so test them first. Extend with `Map`
/ `Set` branches if your domain uses them.
</details>

---

## 🟡 4. `PickByType<T, V>`

Keep only the keys whose value type extends `V`.

<details><summary>Solution</summary>

```ts
type PickByType<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };

type R = PickByType<{ a: string; b: number; c: string }, string>;  // { a: string; c: string }
```
Key remapping to `never` deletes the key. The alternative spelling uses a key filter:

```ts
type KeysMatching<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];
type PickByType2<T, V> = Pick<T, KeysMatching<T, V>>;
```
The `-?` matters: an optional property's type includes `undefined`, which fails
`extends V` and would silently drop the key.
</details>

---

## 🟡 5. Typed `get(obj, 'a.b.c')`

The return type must follow the dotted path.

<details><summary>Solution</summary>

```ts
type Paths<T, Prefix extends string = ''> = T extends object
  ? { [K in keyof T & string]: T[K] extends object
        ? `${Prefix}${K}` | Paths<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`
    }[keyof T & string]
  : never;

type PathValue<T, P extends string> =
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T ? PathValue<T[K], Rest> : never
    : P extends keyof T ? T[P] : never;

// note the shape: inferring P against a constraint that itself depends on T makes the
// compiler fall back to the whole `Paths<T>` union. Taking `P extends string` and
// intersecting at the parameter keeps the literal.
declare function get<T, P extends string>(obj: T, path: P & Paths<T>): PathValue<T, P>;

const cfg = { db: { host: 'x', port: 1 }, debug: true };
get(cfg, 'db.host');   // string ✓
get(cfg, 'db.port');   // number ✓
get(cfg, 'db.nope');   // ✗
```
</details>

---

## 🟡 6. `Result<T, E>` with a type-preserving `flatMap`

<details><summary>Solution</summary>

```ts
type Result<T, E = Error> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E };

function flatMap<T, U, E, F>(
  r: Result<T, E>,
  fn: (value: T) => Result<U, F>
): Result<U, E | F> {
  return r.ok ? fn(r.value) : r;
}
```
The interesting part: returning `r` in the error branch type-checks because
`{ ok: false; error: E }` is assignable to `Result<U, E | F>` — the error member does
not mention `T`. Widening the error to `E | F` is what lets the callback introduce new
failure modes; the simpler `E`-only version is the one in
`packages/core/src/result.ts`.
</details>

---

## 🟢 7. Why is `[] as const` a `readonly []` but `[] as never[]` not?

<details><summary>Solution</summary>

`as const` is a *const assertion*, not a type assertion: it instructs the inference
algorithm to keep literal types and add `readonly`, producing `readonly []`.
`as never[]` is an ordinary type assertion, which only reinterprets the expression's
type and never changes mutability. Different mechanisms sharing the `as` keyword.
</details>

---

## 🟡 8. Exhaustive `switch` that breaks when a variant is added

<details><summary>Solution</summary>

```ts
function assertNever(x: never, msg = 'Unexpected variant'): never {
  throw new Error(`${msg}: ${JSON.stringify(x)}`);
}

type Shape = { kind: 'circle'; r: number } | { kind: 'square'; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.r ** 2;
    case 'square': return s.side ** 2;
    default: return assertNever(s);
  }
}
```
Adding `{ kind: 'tri'; base: number; h: number }` makes `s` in the default branch that
member instead of `never`, and the call to `assertNever` fails to compile.
</details>

---

## 🟡 9. `debounce` that preserves the argument types

<details><summary>Solution</summary>

```ts
function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A): void => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const search = debounce((q: string, page: number) => {}, 200);
search('a', 1);   // ✓
search('a');      // ✗
```
Two details worth saying out loud: `A extends unknown[]` (not `any[]`, which would
re-enable `any` in the body), and `ReturnType<typeof setTimeout>` so the same code
compiles under both DOM and Node lib settings.
</details>

---

## 🔴 10. `UnionToIntersection<U>`

<details><summary>Solution</summary>

```ts
type UnionToIntersection<U> =
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type R = UnionToIntersection<{ a: 1 } | { b: 2 }>;   // { a: 1 } & { b: 2 }
```
How it works: the naked `U extends any` distributes, producing a union of function
types. Inferring a single `I` from a *parameter* position is contravariant, and
contravariant inference from multiple candidates produces their **intersection**.
</details>

---

## 🔴 11. `Equals<A, B>` — strict type equality

<details><summary>Solution</summary>

```ts
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type E1 = Equals<{ a: string }, { a: string }>;   // true
type E2 = Equals<any, string>;                    // false
type E3 = Equals<'a' | 'b', 'b' | 'a'>;           // true
```
This exploits the compiler's internal identity comparison of *deferred* conditional
types: two generic signatures are related only if their conditional types are
structurally identical, which is a stricter test than mutual assignability. It is the
only reliable way to distinguish `any` from other types.
</details>

---

## 🔴 12. Type-level `Add<A, B>`

<details><summary>Solution</summary>

```ts
type BuildTuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>;

type Add<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]['length'];

type Five = Add<2, 3>;   // 5
```
Numbers are represented as tuple lengths; addition is concatenation. It works up to
roughly 1000 before hitting the instantiation cap. Subtraction is
`BuildTuple<A> extends [...BuildTuple<B>, ...infer R] ? R['length'] : never`.
</details>

---

## 🔴 13. `Split<S, D>` and `Join<T, D>`

<details><summary>Solution</summary>

```ts
type Split<S extends string, D extends string> =
  S extends `${infer H}${D}${infer R}` ? [H, ...Split<R, D>] : [S];

type Join<T extends readonly string[], D extends string> =
  T extends readonly [infer F extends string, ...infer R extends string[]]
    ? R['length'] extends 0 ? F : `${F}${D}${Join<R, D>}`
    : '';

type A = Split<'a.b.c', '.'>;      // ['a', 'b', 'c']
type B = Join<['a', 'b'], '-'>;    // 'a-b'
```
</details>

---

## 🔴 14. A typed router from a path string

<details><summary>Solution</summary>

```ts
type Params<S extends string> =
  S extends `${string}:${infer P}/${infer Rest}` ? P | Params<`/${Rest}`>
  : S extends `${string}:${infer P}` ? P
  : never;

type RouteParams<S extends string> = { [K in Params<S>]: string };

declare function route<S extends string>(
  path: S,
  handler: (params: RouteParams<S>) => void
): void;

route('/users/:userId/posts/:postId', (p) => {
  p.userId; p.postId;   // ✓
  p.nope;               // ✗
});
```
</details>

---

## 🟡 15. Make illegal states unrepresentable

Rewrite this so that "loading with an error present" cannot compile:

```ts
type State = { isLoading: boolean; data?: User[]; error?: Error };
```

<details><summary>Solution</summary>

```ts
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; error: Error };
```
Three booleans/optionals allow 2³ × … combinations, most of them nonsense. The union
has exactly four inhabitants, and each field exists only where it is meaningful. This
is the single most valuable modelling move in the language.
</details>

---

## 🟡 16. `AtLeastOne<T>`

An object where at least one key must be present.

<details><summary>Solution</summary>

```ts
type AtLeastOne<T, K extends keyof T = keyof T> =
  K extends keyof T ? Required<Pick<T, K>> & Partial<Omit<T, K>> : never;

type Filter = AtLeastOne<{ id?: string; name?: string }>;
const a: Filter = { id: 'x' };   // ✓
const b: Filter = {};            // ✗
```
The distributive conditional generates one union member per key, each requiring that
key and leaving the rest optional.
</details>

---

## 🟡 17. Why does this fail, and how do you fix it?

```ts
function update<T extends { id: string }>(entity: T, id: string): T {
  return { id };   // ✗
}
```

<details><summary>Solution</summary>

`T` is *constrained by* `{ id: string }`, but it is not that type — a caller may pass
`{ id: string; name: string }`, and returning `{ id }` would drop `name` while claiming
to return `T`. Fix by spreading:

```ts
function update<T extends { id: string }>(entity: T, id: string): T {
  return { ...entity, id };
}
```
This is the most common generics misunderstanding; being able to explain *why* the
compiler is right is the signal.
</details>

---

## 🟡 18. `Entries<T>` and a typed `Object.entries`

<details><summary>Solution</summary>

```ts
type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T][];

declare function entries<T extends object>(obj: T): Entries<T>;

const e = entries({ a: 1, b: 'x' });   // (['a', number] | ['b', string])[]
```
Note this is *unsound* in the same way `Object.keys` is: an object may have extra
properties at runtime (structural typing does not mean exact). The built-in
`Object.entries` returns `[string, T[keyof T]][]` precisely to avoid promising more
than it can deliver.
</details>

---

## 🔴 19. `IsUnion<T>`

<details><summary>Solution</summary>

```ts
type IsUnion<T, U = T> = T extends any ? ([U] extends [T] ? false : true) : never;

type A = IsUnion<string>;            // false
type B = IsUnion<string | number>;   // true
type C = IsUnion<never>;             // never
```
`T` distributes (so inside the branch it is one member), while `U` — captured as a
default parameter before distribution — remains the whole union. If the whole union is
assignable to the single member, it was not a union.
</details>

---

## 🟡 20. Type an exhaustive handler map with narrowed payloads

<details><summary>Solution</summary>

```ts
type Action =
  | { type: 'add'; product: Product }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

type Handlers = { [A in Action as A['type']]: (action: A) => void };

const handlers: Handlers = {
  add:    (a) => a.product,   // a: the add member ✓
  remove: (a) => a.id,
  clear:  () => {},
};
```
Key remapping over a union of objects (`A in Action as A['type']`) is the mechanism.
Omitting a key is a compile error; the handler parameter is narrowed per key.
</details>

---

## Where to go next

- Re-read [ch. 7](07-conditional-types.md) and [ch. 8](08-mapped-template-literal-types.md)
  once these are comfortable — they are the same tools, applied.
- [type-challenges](https://github.com/type-challenges/type-challenges) for a few
  hundred more, graded.
- The `.d.ts` files in `node_modules/typescript/lib/lib.es5.d.ts` — read the utility
  type implementations in situ; that is where they all live.
- This repo's own code: `packages/core/src/` is the same ideas at working scale.
