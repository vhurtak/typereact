# 7. Conditional types

`T extends U ? X : Y` is the `if` of the type language. `infer` is its pattern match.
Together with recursion they make the type level Turing-complete.

## 7.1 The basic form

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<'a'>;      // true
type B = IsString<number>;   // false
```

`extends` here means **assignable to**, i.e. subset-of, not "inherits from".

```ts
type T1 = 'a' extends string ? 1 : 0;         // 1
type T2 = string extends 'a' ? 1 : 0;         // 0
type T3 = { a: 1; b: 2 } extends { a: 1 } ? 1 : 0;   // 1 — structural
type T4 = never extends string ? 1 : 0;       // 1 — never ⊆ everything
type T5 = any extends string ? 1 : 0;         // 1 | 0 (!) — `any` takes both branches
```

That `any` behaviour is a genuine special case worth remembering.

---

## 7.2 `infer`

`infer X` introduces a type variable bound by pattern matching, usable in the true
branch.

```ts
type ElementOf<T> = T extends readonly (infer U)[] ? U : never;
type E1 = ElementOf<string[]>;             // string
type E2 = ElementOf<readonly [1, 2]>;      // 1 | 2
type E3 = ElementOf<number>;               // never

type ReturnOf<F> = F extends (...args: any[]) => infer R ? R : never;
type ArgsOf<F> = F extends (...args: infer A) => any ? A : never;
type FirstArg<F> = F extends (a: infer A, ...rest: any[]) => any ? A : never;

type Unwrap<T> = T extends Promise<infer U> ? U : T;
type InstanceOf<C> = C extends new (...a: any[]) => infer I ? I : never;
type PropType<T, K extends string> = T extends { [P in K]: infer V } ? V : never;
```

Multiple `infer`s in one pattern:

```ts
type SplitFn<F> = F extends (a: infer A, b: infer B) => infer R ? { a: A; b: B; r: R } : never;
```

The same variable inferred in several positions produces a **union** in a covariant
position and an **intersection** in a contravariant one — a genuinely useful trick:

```ts
type Co<T> = T extends { a: infer U; b: infer U } ? U : never;
type C1 = Co<{ a: string; b: number }>;    // string | number

type Contra<T> = T extends { a: (x: infer U) => void; b: (x: infer U) => void } ? U : never;
type C2 = Contra<{ a: (x: string) => void; b: (x: number) => void }>;   // string & number = never
```

That contravariant form is how `UnionToIntersection` is written:

```ts
type UnionToIntersection<U> =
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type UI = UnionToIntersection<{ a: 1 } | { b: 2 }>;   // { a: 1 } & { b: 2 }
```

### Constrained `infer` (TS 4.7)

```ts
type FirstString<T> = T extends readonly [infer S extends string, ...unknown[]] ? S : never;
type F1 = FirstString<['a', 1]>;   // 'a'
type F2 = FirstString<[1, 'a']>;   // never

// parse a numeric string literal into a number literal
type ToNumber<S extends string> = S extends `${infer N extends number}` ? N : never;
type N = ToNumber<'42'>;   // 42
```

---

## 7.3 Distributivity — the gotcha interviewers love

When the checked type is a **naked type parameter** and the argument is a union, the
conditional **distributes** over the union members.

```ts
type ToArray<T> = T extends any ? T[] : never;
type R = ToArray<string | number>;   // string[] | number[]   (NOT (string|number)[])
```

This is why `Exclude` works:

```ts
type Exclude<T, U> = T extends U ? never : T;
type X = Exclude<'a' | 'b' | 'c', 'a'>;
//    = (('a' extends 'a' ? never : 'a') | ('b' … ) | ('c' … ))
//    = never | 'b' | 'c'
//    = 'b' | 'c'      ← never disappears from a union
```

**Turn it off** by wrapping both sides in a tuple:

```ts
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type R2 = ToArrayNonDist<string | number>;   // (string | number)[]
```

Three consequences you should be able to explain:

```ts
// 1. never as the argument produces never, because there is nothing to distribute over
type IsNever1<T> = T extends never ? true : false;
type Q1 = IsNever1<never>;             // never (!), not true
type IsNever2<T> = [T] extends [never] ? true : false;
type Q2 = IsNever2<never>;             // true ✓  — the correct way to test for never

// 2. boolean distributes, because boolean = true | false
type IsTrue<T> = T extends true ? 'y' : 'n';
type Q3 = IsTrue<boolean>;             // 'y' | 'n'

// 3. distribution only happens on a NAKED parameter
type Naked<T> = T extends string ? 1 : 0;          // distributes
type Wrapped<T> = { v: T } extends { v: string } ? 1 : 0;   // does not
```

Also useful: `IsAny` and `IsUnknown`, which exploit `any`'s dual-branch behaviour:

```ts
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsUnknown<T> = [unknown] extends [T] ? ([T] extends [unknown] ? true : false) : false;
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type E1 = Equals<{ a: string }, { a: string }>;   // true
type E2 = Equals<any, string>;                    // false — this is THE strict equality test
```

`Equals` relies on an internal identity check on deferred conditional types. It is the
standard trick behind every "type-challenges" test harness.

---

## 7.4 Recursive conditional types

Recursion is the loop.

```ts
// unwrap nested promises (this is essentially the built-in `Awaited`)
type DeepAwaited<T> = T extends PromiseLike<infer U> ? DeepAwaited<U> : T;
type A1 = DeepAwaited<Promise<Promise<string>>>;   // string

// flatten nested arrays
type Flatten<T> = T extends readonly (infer U)[] ? Flatten<U> : T;
type F1 = Flatten<number[][][]>;   // number

// deep readonly / deep partial
type DeepReadonly<T> =
  T extends (...args: any[]) => any ? T
  : T extends readonly (infer U)[] ? ReadonlyArray<DeepReadonly<U>>
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

type DeepPartial<T> =
  T extends (...args: any[]) => any ? T
  : T extends readonly (infer U)[] ? ReadonlyArray<DeepPartial<U>>
  : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;
```

Order matters: check functions and arrays **before** `object`, because both are objects.

### String recursion

```ts
type Split<S extends string, D extends string> =
  S extends `${infer Head}${D}${infer Rest}` ? [Head, ...Split<Rest, D>] : [S];

type P = Split<'a.b.c', '.'>;   // ['a', 'b', 'c']

type Join<T extends readonly string[], D extends string> =
  T extends readonly [infer F extends string, ...infer R extends string[]]
    ? R['length'] extends 0 ? F : `${F}${D}${Join<R, D>}`
    : '';

type J = Join<['a', 'b', 'c'], '-'>;   // 'a-b-c'

type Trim<S extends string> =
  S extends ` ${infer R}` ? Trim<R> : S extends `${infer R} ` ? Trim<R> : S;
```

### The killer application: dotted-path access

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

type Config = { db: { host: string; port: number }; debug: boolean };

type AllPaths = Paths<Config>;   // 'db' | 'db.host' | 'db.port' | 'debug'

// note the shape: inferring P against a constraint that itself depends on T makes the
// compiler fall back to the whole `Paths<T>` union. Taking `P extends string` and
// intersecting at the parameter keeps the literal.
declare function get<T, P extends string>(obj: T, path: P & Paths<T>): PathValue<T, P>;

declare const cfg: Config;
const host = get(cfg, 'db.host');   // string ✓
const port = get(cfg, 'db.port');   // number ✓
get(cfg, 'db.nope');                // ✗ not assignable to Paths<Config>
```

This is how `lodash.get`, i18n key checking, and form libraries (`react-hook-form`)
get their type safety.

---

## 7.5 Recursion limits and tail recursion

TypeScript caps instantiation depth (≈50 nested, ≈100 for some paths) and errors with:

> Type instantiation is excessively deep and possibly infinite. (ts2589)

Since TS 4.5, **tail-recursive conditional types** are optimised and can run to ~1000
iterations. Tail-recursive means the recursive call is the *entire* branch result —
accumulate in a parameter instead of composing on the way out:

```ts
// ✗ not tail-recursive: the result is [F, ...Recurse]
type ReverseSlow<T extends unknown[]> =
  T extends [infer F, ...infer R] ? [...ReverseSlow<R>, F] : [];

// ✓ tail-recursive: the recursive call IS the result
type Reverse<T extends unknown[], Acc extends unknown[] = []> =
  T extends [infer F, ...infer R] ? Reverse<R, [F, ...Acc]> : Acc;

type Rev = Reverse<[1, 2, 3]>;   // [3, 2, 1]
```

Same shape for arithmetic:

```ts
type Repeat<S extends string, N extends number, Acc extends string = '', C extends unknown[] = []> =
  C['length'] extends N ? Acc : Repeat<S, N, `${Acc}${S}`, [...C, unknown]>;

type Dashes = Repeat<'-', 5>;   // '-----'
```

Rule of thumb: if you need more than ~20 levels, restructure to tail form or bound the
recursion with a depth counter:

```ts
type DeepPartialBounded<T, D extends number = 5, C extends unknown[] = []> =
  C['length'] extends D ? T
  : T extends object ? { [K in keyof T]?: DeepPartialBounded<T[K], D, [...C, 1]> }
  : T;
```

---

## 7.6 Conditional return types

Conditional types in a function's return position let one function have many shapes.
The cost: the *implementation* cannot verify it, so you need one assertion.

```ts
type Result<T extends boolean> = T extends true ? string : number;

function make<T extends boolean>(asString: T): Result<T> {
  return (asString ? 'x' : 0) as Result<T>;   // the unavoidable cast
}

const a = make(true);    // string
const b = make(false);   // number
```

Usually **overloads read better** for two or three cases, and conditional returns win
when the mapping is computed:

```ts
// computed: the return type follows the selector string
type ElementByTag<T extends string> = T extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[T]
  : HTMLElement;

declare function $<T extends string>(sel: T): ElementByTag<T> | null;
const input = $('input');   // HTMLInputElement | null
```

---

## 7.7 Distributivity in practice: filters over unions

```ts
type Fn = (...args: any[]) => any;

type FunctionKeys<T> = { [K in keyof T]-?: T[K] extends Fn ? K : never }[keyof T];
type DataKeys<T>     = { [K in keyof T]-?: T[K] extends Fn ? never : K }[keyof T];

type Api = { id: string; load(): void; save(): Promise<void> };
type FK = FunctionKeys<Api>;   // 'load' | 'save'
type DK = DataKeys<Api>;       // 'id'
```

The `-?` is required: an optional property's type includes `undefined`, which would
fail the `extends Fn` test and silently drop the key. Removing optionality first is a
standard part of the idiom.

```ts
// filtering a discriminated union
type Action = { type: 'a'; n: number } | { type: 'b' } | { type: 'c'; s: string };
type WithPayload = Extract<Action, { n: unknown } | { s: unknown }>;   // 'a' | 'c' members
type Tags = Action['type'];                                            // 'a' | 'b' | 'c'
```

**Next:** [8. Mapped and template literal types →](08-mapped-template-literal-types.md)
