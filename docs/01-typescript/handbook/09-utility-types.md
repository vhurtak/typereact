# 9. Utility types — every built-in, with its implementation

Reading the implementations is the fastest way to internalise chapters 6–8. Every one
of these is ordinary type-level code you could have written.

## 9.1 Object utilities

```ts
type Partial<T>  = { [K in keyof T]?: T[K] };
type Required<T> = { [K in keyof T]-?: T[K] };
type Readonly<T> = { readonly [K in keyof T]: T[K] };
type Record<K extends keyof any, V> = { [P in K]: V };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```

```ts
type User = { id: string; name: string; email?: string };

type P  = Partial<User>;              // all optional
type R  = Required<User>;             // email: string (not optional, no undefined)
type RO = Readonly<User>;
type Pk = Pick<User, 'id' | 'name'>;  // { id: string; name: string }
type Om = Omit<User, 'email'>;        // { id: string; name: string }
type Rc = Record<'a' | 'b', number>;  // { a: number; b: number }
```

### The `Omit` trap

`Omit<T, K>` does **not** constrain `K` to `keyof T` (deliberately, for union inputs).
Typos pass silently:

```ts
type Oops = Omit<User, 'emial'>;   // no error — returns User unchanged
```

Use a checked variant on your own code:

```ts
type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type Bad = StrictOmit<User, 'emial'>;   // ✗ caught
```

`Omit` is also **not distributive** over unions, which silently flattens discriminated
unions:

```ts
type A = { kind: 'a'; x: number } | { kind: 'b'; y: string };
type O = Omit<A, 'kind'>;   // { } — both members lose their discriminant and merge badly

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
type O2 = DistributiveOmit<A, 'kind'>;   // { x: number } | { y: string } ✓
```

The same applies to `Pick`, `Partial` and friends on unions. Wrap in `T extends any ? … : never`
when the input is a union.

---

## 9.2 Union utilities

```ts
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T & {};        // since TS 4.8; previously Exclude<T, null | undefined>
```

```ts
type E1 = Exclude<'a' | 'b' | 'c', 'a'>;        // 'b' | 'c'
type E2 = Extract<string | number | (() => void), Function>;   // () => void
type E3 = NonNullable<string | null | undefined>;              // string

// on discriminated unions — the pattern you will use most
type Action = { type: 'add'; n: number } | { type: 'del'; id: string } | { type: 'clear' };
type AddAction = Extract<Action, { type: 'add' }>;   // { type: 'add'; n: number }
type Mutating = Exclude<Action, { type: 'clear' }>;
```

Both rely on [distributivity](07-conditional-types.md#73-distributivity--the-gotcha-interviewers-love).

---

## 9.3 Function and constructor utilities

```ts
type Parameters<F extends (...a: any) => any> = F extends (...a: infer P) => any ? P : never;
type ReturnType<F extends (...a: any) => any> = F extends (...a: any) => infer R ? R : any;
type ConstructorParameters<C extends abstract new (...a: any) => any> =
  C extends abstract new (...a: infer P) => any ? P : never;
type InstanceType<C extends abstract new (...a: any) => any> =
  C extends abstract new (...a: any) => infer R ? R : any;
type ThisParameterType<F> = F extends (this: infer U, ...a: never) => any ? U : unknown;
type OmitThisParameter<F> = …;
```

```ts
declare function fetchUser(id: string, opts?: RequestInit): Promise<User>;

type Args = Parameters<typeof fetchUser>;      // [id: string, opts?: RequestInit]
type Ret  = ReturnType<typeof fetchUser>;      // Promise<User>
type Val  = Awaited<Ret>;                      // User
type Ctor = ConstructorParameters<typeof Map>; // constructor arg tuple
type Inst = InstanceType<typeof Map>;          // Map<any, any>
```

**Overloads only resolve to the last signature** through `ReturnType`/`Parameters` —
a real limitation:

```ts
declare function over(a: string): number;
declare function over(a: number): string;
type Rt = ReturnType<typeof over>;   // string — only the last overload
```

---

## 9.4 `Awaited` and promises

```ts
type Awaited<T> =
  T extends null | undefined ? T
  : T extends object & { then(onfulfilled: infer F, ...args: infer _): any }
    ? F extends (value: infer V, ...args: infer _) => any ? Awaited<V> : never
    : T;
```

```ts
type A1 = Awaited<Promise<string>>;               // string
type A2 = Awaited<Promise<Promise<number>>>;      // number — recursive
type A3 = Awaited<string>;                        // string — non-promises pass through
type A4 = Awaited<Promise<string> | number>;      // string | number

// the real use: typing Promise.all results
declare function allSettled<T extends readonly unknown[]>(
  values: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }>;   // homomorphic → tuple preserved
```

---

## 9.5 String intrinsics

```ts
type U = Uppercase<'hi'>;      // 'HI'
type L = Lowercase<'HI'>;      // 'hi'
type C = Capitalize<'hi'>;     // 'Hi'
type Un = Uncapitalize<'Hi'>;  // 'hi'
```

Compiler intrinsics — not expressible in the type language. They distribute over unions.

---

## 9.6 The rest

```ts
type NoInfer<T>       // TS 5.4 — block a site from inference (see 6.4)
type ThisType<T>      // marker: sets `this` in object-literal methods; needs noImplicitThis
```

```ts
// NoInfer
declare function pick<T>(items: T[], fallback: NoInfer<T>): T;
pick(['a', 'b'], 'c');     // T = string, from items only

// ThisType
type Ctx<S, M> = { state: S; methods: M & ThisType<S & M> };
const o = {
  state: { n: 0 },
  methods: { inc() { this.n++; } },   // `this` is state & methods
} satisfies Ctx<{ n: number }, { inc(): void }>;
```

---

## 9.7 Utility types you should add yourself

None of these ship with TypeScript, and all of them come up.

```ts
// ---- depth ----
type DeepPartial<T> =
  T extends (...a: any[]) => any ? T
  : T extends readonly (infer U)[] ? ReadonlyArray<DeepPartial<U>>
  : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

type DeepReadonly<T> =
  T extends (...a: any[]) => any ? T
  : T extends readonly (infer U)[] ? ReadonlyArray<DeepReadonly<U>>
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

type DeepRequired<T> =
  T extends object ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> } : T;

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type DeepMutable<T> =
  T extends object ? { -readonly [K in keyof T]: DeepMutable<T[K]> } : T;

// ---- key selection ----
type KeysMatching<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];
type PickByType<T, V>  = Pick<T, KeysMatching<T, V>>;
type OmitByType<T, V>  = Omit<T, KeysMatching<T, V>>;
type OptionalKeys<T>   = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];
type RequiredKeys<T>   = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
type ReadonlyKeys<T>   = { [K in keyof T]-?:
  Equals<{ [P in K]: T[P] }, { -readonly [P in K]: T[P] }> extends true ? never : K }[keyof T];

// ---- required/optional surgery ----
type SetRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
type SetOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type RequireAtLeastOne<T, K extends keyof T = keyof T> =
  Omit<T, K> & { [P in K]-?: Required<Pick<T, P>> & Partial<Omit<T, P>> }[K];
type RequireExactlyOne<T, K extends keyof T = keyof T> =
  { [P in K]: Required<Pick<T, P>> & Partial<Record<Exclude<K, P>, never>> }[K] & Omit<T, K>;

// ---- unions ----
type UnionToIntersection<U> =
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
type LastOf<U> = UnionToIntersection<U extends any ? () => U : never> extends () => infer R ? R : never;
type UnionToTuple<U, Acc extends unknown[] = []> =
  [U] extends [never] ? Acc : UnionToTuple<Exclude<U, LastOf<U>>, [LastOf<U>, ...Acc]>;

type T1 = UnionToTuple<'a' | 'b' | 'c'>;   // ['a','b','c'] (order is an implementation detail)

// ---- predicates ----
type IsNever<T>   = [T] extends [never] ? true : false;
type IsAny<T>     = 0 extends 1 & T ? true : false;
type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false;
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type IsUnion<T, U = T> = T extends any ? ([U] extends [T] ? false : true) : never;

// ---- misc ----
type Prettify<T> = { [K in keyof T]: T[K] } & {};   // flattens intersections in tooltips
type Simplify<T> = Prettify<T>;
type ValueOf<T> = T[keyof T];
type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;
type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T][];
type Nullish<T> = T | null | undefined;
type Brand<T, B extends string> = T & { readonly __brand: B };
type Opaque<T, B> = T & { readonly __opaque: B };
type XOR<A, B> =
  | (A & { [K in Exclude<keyof B, keyof A>]?: never })
  | (B & { [K in Exclude<keyof A, keyof B>]?: never });
```

`Prettify` deserves a note: intersections display as `A & B & C` in tooltips and error
messages, which is unreadable. Wrapping in `{ [K in keyof T]: T[K] } & {}` forces the
checker to compute a single flat object type — purely cosmetic, hugely useful.

```ts
type Messy = { a: string } & { b: number } & { c: boolean };
type Clean = Prettify<Messy>;   // { a: string; b: number; c: boolean } in the tooltip
```

---

## 9.8 When a utility type lies to you

```ts
// 1. Partial<T> does not make nested objects partial
type P = Partial<{ a: { b: string } }>;
const p: P = { a: {} };   // ✗ — `a` is optional, but if present it must be complete

// 2. Required<T> strips undefined from the VALUE too
type R = Required<{ a?: string | undefined }>;   // { a: string }

// 3. Readonly<T> is shallow and does not stop array mutation
const r: Readonly<{ xs: number[] }> = { xs: [] };
r.xs.push(1);   // ✓ allowed

// 4. Record<string, T> claims every key exists
const rec: Record<string, number> = {};
rec.anything.toFixed();   // number per the type, undefined at runtime
// → use Partial<Record<string, T>> or noUncheckedIndexedAccess

// 5. Omit/Pick/Partial collapse discriminated unions (see 9.1)

// 6. ReturnType on an overloaded function sees only the last signature (see 9.3)
```

Consider `type-fest` if you want these maintained for you; the point of writing them
once by hand is that afterwards you can read anyone's.

**Next:** [10. Classes →](10-classes.md)
