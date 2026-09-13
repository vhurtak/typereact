# 8. Mapped types and template literal types

## 8.1 Mapped types — the `map` of the type language

```ts
type Mapped<T> = { [K in keyof T]: T[K] };   // identity
```

`K in keyof T` iterates the keys; the body computes the new value type.

```ts
type User = { id: string; age: number };

type Nullable<T> = { [K in keyof T]: T[K] | null };
type N = Nullable<User>;      // { id: string | null; age: number | null }

type Stringify<T> = { [K in keyof T]: string };
type S = Stringify<User>;     // { id: string; age: string }

type Getters<T> = { [K in keyof T]: () => T[K] };
type G = Getters<User>;       // { id: () => string; age: () => number }
```

The source of keys can be any union of `PropertyKey`, not just `keyof`:

```ts
type Flags = { [K in 'read' | 'write' | 'exec']: boolean };
// { read: boolean; write: boolean; exec: boolean }

type ByCategory<T> = { [K in Category]: T[] };
```

That is exactly what `Record` is:

```ts
type Record<K extends keyof any, V> = { [P in K]: V };
```

---

## 8.2 Modifiers: `readonly`, `?`, and removing them

Add with `readonly` / `?`; remove with `-readonly` / `-?`.

```ts
type Readonly<T>  = { readonly [K in keyof T]: T[K] };
type Partial<T>   = { [K in keyof T]?: T[K] };
type Required<T>  = { [K in keyof T]-?: T[K] };
type Mutable<T>   = { -readonly [K in keyof T]: T[K] };

// combine
type Frozen<T> = { readonly [K in keyof T]-?: T[K] };
type Draft<T>  = { -readonly [K in keyof T]?: T[K] };
```

`-?` also strips `undefined` from the value type, which is why it matters in key
filters:

```ts
type T1 = { a?: string };
type R1 = Required<T1>;    // { a: string }   ← undefined removed too
```

### Homomorphic mapped types

A mapped type of the exact form `{ [K in keyof T]: … }` is *homomorphic*: it preserves
`readonly`/`?` modifiers, and — crucially — it **maps over arrays and tuples as arrays
and tuples**, not as objects.

```ts
type Boxed<T> = { [K in keyof T]: { value: T[K] } };

type B1 = Boxed<[string, number]>;   // [{ value: string }, { value: number }]  ✓ tuple preserved
type B2 = Boxed<string[]>;           // { value: string }[]                     ✓ array preserved

// NON-homomorphic — the `as`/explicit key source breaks it
type Boxed2<T> = { [K in keyof T as K]: { value: T[K] } };
type B3 = Boxed2<[string, number]>;  // an object with keys '0' | '1' | 'length' | 'map' | …
```

Homomorphy is also why `Partial<T>` on a tuple gives a tuple of optionals rather than
an object. When you need it, keep the `[K in keyof T]` shape.

---

## 8.3 Key remapping with `as` (TS 4.1)

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};

type User = { name: string; age: number };
type G = Getters<User>;
// { getName: () => string; getAge: () => number }
```

Mapping a key to `never` **removes** it — this is how filtering works:

```ts
type OmitByType<T, V> = { [K in keyof T as T[K] extends V ? never : K]: T[K] };
type PickByType<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };

type Mixed = { a: string; b: number; c: string; fn(): void };
type OnlyStrings = PickByType<Mixed, string>;   // { a: string; c: string }
type NoFunctions = OmitByType<Mixed, (...a: any[]) => any>;   // { a; b; c }
```

Which is also how `Omit` and `Exclude`-style key filters are really built:

```ts
type Omit2<T, K extends keyof any> = { [P in keyof T as P extends K ? never : P]: T[P] };
```

Remapping a **union of objects** to a keyed lookup — the reducer/registry pattern:

```ts
type Action = { type: 'add'; n: number } | { type: 'del'; id: string };

type ActionByType = { [A in Action as A['type']]: A };
// { add: { type: 'add'; n: number }; del: { type: 'del'; id: string } }

type Handlers = { [A in Action as A['type']]: (a: A) => void };
// { add: (a: AddAction) => void; del: (a: DelAction) => void }
```

Two keys can map to the same target key; the values then intersect.

---

## 8.4 Template literal types

```ts
type Greeting = `hello ${string}`;
const g1: Greeting = 'hello world';   // ✓
const g2: Greeting = 'hi';            // ✗
```

Unions in any slot produce the **cross-product**:

```ts
type Lang = 'en' | 'de';
type Region = 'US' | 'GB';
type Locale = `${Lang}-${Region}`;   // 'en-US' | 'en-GB' | 'de-US' | 'de-GB'
```

Placeholders accept `string | number | bigint | boolean | null | undefined`:

```ts
type Px = `${number}px`;
const p1: Px = '10px';    // ✓
const p2: Px = '10em';    // ✗

type Hex = `#${string}`;
type CssVar = `--${string}`;
type Route = `/${string}`;
type HttpUrl = `http${'' | 's'}://${string}`;
```

### The four intrinsic string types

```ts
type A = Uppercase<'hello'>;    // 'HELLO'
type B = Lowercase<'HELLO'>;    // 'hello'
type C = Capitalize<'hello'>;   // 'Hello'
type D = Uncapitalize<'Hello'>; // 'hello'
```

They are compiler intrinsics — you cannot implement them in the type language.

### Pattern matching on strings

```ts
type ExtractParams<S extends string> =
  S extends `${string}:${infer Param}/${infer Rest}` ? Param | ExtractParams<`/${Rest}`>
  : S extends `${string}:${infer Param}` ? Param
  : never;

type P = ExtractParams<'/users/:userId/posts/:postId'>;   // 'userId' | 'postId'

// turn them into a params object — a typed router in 6 lines
type RouteParams<S extends string> = { [K in ExtractParams<S>]: string };

declare function route<S extends string>(
  path: S,
  handler: (params: RouteParams<S>) => void
): void;

route('/users/:userId/posts/:postId', (p) => {
  p.userId;   // ✓ string
  p.postId;   // ✓ string
  p.nope;     // ✗
});
```

### Case conversion between naming conventions

```ts
type SnakeToCamel<S extends string> =
  S extends `${infer H}_${infer T}` ? `${H}${Capitalize<SnakeToCamel<T>>}` : S;

type CamelToSnake<S extends string> =
  S extends `${infer H}${infer T}`
    ? T extends Uncapitalize<T>
      ? `${Lowercase<H>}${CamelToSnake<T>}`
      : `${Lowercase<H>}_${CamelToSnake<T>}`
    : S;

type C1 = SnakeToCamel<'user_first_name'>;   // 'userFirstName'
type C2 = CamelToSnake<'userFirstName'>;     // 'user_first_name'

// apply it across an object — the API-response adapter type
type CamelKeys<T> = { [K in keyof T as SnakeToCamel<string & K>]: T[K] };
type ApiUser = { user_id: string; first_name: string };
type AppUser = CamelKeys<ApiUser>;   // { userId: string; firstName: string }
```

---

## 8.5 Combining everything: worked examples

### Typed CSS-in-JS

```ts
type CssProps = {
  [K in keyof CSSStyleDeclaration as K extends string ? K : never]?: string | number
};
```

### A deep-path autocomplete for i18n keys

```ts
type Leaves<T, P extends string = ''> = T extends string
  ? P
  : { [K in keyof T & string]: Leaves<T[K], P extends '' ? K : `${P}.${K}`> }[keyof T & string];

const messages = {
  home: { title: 'Home', cta: { primary: 'Go' } },
  errors: { notFound: '404' },
} as const;

type MessageKey = Leaves<typeof messages>;
// 'home.title' | 'home.cta.primary' | 'errors.notFound'

declare function t(key: MessageKey): string;
t('home.cta.primary');   // ✓
t('home.cta.secondary'); // ✗
```

### A form-state type derived from a values type

```ts
type FormState<T> = {
  values: T;
  errors: { [K in keyof T]?: string };
  touched: { [K in keyof T]: boolean };
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
};

type LoginForm = FormState<{ email: string; password: string }>;
```

### An "at least one key" type

```ts
type AtLeastOne<T, K extends keyof T = keyof T> =
  K extends keyof T ? Required<Pick<T, K>> & Partial<Omit<T, K>> : never;

type Filter = AtLeastOne<{ id?: string; name?: string; tag?: string }>;
const f1: Filter = { id: 'x' };   // ✓
const f2: Filter = {};            // ✗
```

### Autocomplete that still accepts any string

The `& {}` trick prevents the union from collapsing to `string`, so the editor keeps
suggesting the known literals:

```ts
type LiteralUnion<T extends string> = T | (string & {});

type Color = LiteralUnion<'red' | 'green' | 'blue'>;
const c1: Color = 'red';        // suggested
const c2: Color = '#ff0000';    // still allowed
```

---

## 8.6 Performance notes

Mapped and template literal types are evaluated **lazily** but memoised per
instantiation. Two things blow up compile times:

1. **Cross-products.** `${A}-${B}-${C}` with 50-member unions is 125,000 members; TS
   caps template literal unions at 100,000 and errors beyond that.
2. **Deep recursion over large objects.** `DeepPartial<HugeApiSchema>` re-instantiates
   the whole tree at every use site. Alias the result once:

```ts
type Draft = DeepPartial<HugeApiSchema>;   // computed once, reused
```

Use `tsc --generateTrace trace/` and `--diagnostics` when the editor gets slow; the
trace names the exact type that is expensive.

**Next:** [9. Utility types →](09-utility-types.md)
