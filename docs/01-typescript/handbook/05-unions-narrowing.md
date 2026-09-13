# 5. Unions, intersections and narrowing

## 5.1 Unions

`A | B` is the set union. You may only use members present in **every** branch.

```ts
type Id = string | number;

declare const id: Id;
id.toString();     // ✓ on both
id.toUpperCase();  // ✗ Property 'toUpperCase' does not exist on type 'number'
```

For a union of *object* types, the accessible members are the intersection of the
member sets — but `keyof` follows the same rule:

```ts
type A = { a: string; shared: string };
type B = { b: number; shared: string };
type U = A | B;

declare const u: U;
u.shared;          // ✓
u.a;               // ✗ Property 'a' does not exist on type 'B'

type KU = keyof U; // 'shared'  ← keyof distributes as an INTERSECTION of key sets
```

Calling a union of function types requires an argument acceptable to all of them:

```ts
type F = ((x: string) => void) | ((x: number) => void);
declare const f: F;
f('a');   // ✗ argument must satisfy both — i.e. be `string & number` = never
```

---

## 5.2 Intersections

`A & B` is the set intersection: values that satisfy both. For objects that means
*more* members.

```ts
type WithId = { id: string };
type Timestamped = { createdAt: Date };
type Entity = WithId & Timestamped;   // { id: string; createdAt: Date }
```

Conflicting primitive members collapse to `never`:

```ts
type Bad = { a: string } & { a: number };
type A = Bad['a'];    // never
const b: Bad = { a: 1 };   // ✗ — confusing error, far from the declaration
```

That is the argument for `interface extends`, which errors at the declaration instead.

Intersecting functions produces an **overload set**:

```ts
type Parse = ((s: string) => object) & ((b: Buffer) => object);
declare const parse: Parse;
parse('{}');   // ✓
```

Intersecting a primitive with an object is how [branding](14-patterns-recipes.md) works:

```ts
type ProductId = string & { readonly __brand: 'ProductId' };
```

---

## 5.3 Discriminated (tagged) unions

The most valuable modelling tool in the language. Requirements: every member has a
property with a **literal type**, and the literal is unique per member.

```ts
type RemoteData<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };
```

Compare with the shape people write by default:

```ts
type Bad<T> = { isLoading: boolean; isError: boolean; data?: T; error?: Error };
```

Four booleans = 2⁴ = 16 states; roughly 12 are nonsense (`isLoading && isError`,
`!isLoading && !data && !error`, …). The union has exactly 4, and `data` exists only
where it means something. *Make illegal states unrepresentable* — say this sentence in
an interview.

Switching on the discriminant narrows each branch:

```ts
function render<T>(s: RemoteData<T[]>): string {
  switch (s.status) {
    case 'idle':    return '';
    case 'loading': return 'spinner';
    case 'success': return `${s.data.length} items`;   // `data` only here
    case 'error':   return s.error.message;
    default:        return assertNever(s);
  }
}
```

Constructors keep call sites tidy and make the union easy to build:

```ts
const remote = {
  idle:    <T, E = Error>(): RemoteData<T, E> => ({ status: 'idle' }),
  loading: <T, E = Error>(): RemoteData<T, E> => ({ status: 'loading' }),
  success: <T, E = Error>(data: T): RemoteData<T, E> => ({ status: 'success', data }),
  error:   <T, E = Error>(error: E): RemoteData<T, E> => ({ status: 'error', error }),
} as const;
```

Discriminants can be `boolean` (it is `true | false`, a union of literals), which is
what makes `Result` work:

```ts
type Result<T, E = Error> =
  | { ok: true;  value: T }
  | { ok: false; error: E };

declare const r: Result<number>;
if (r.ok) r.value; else r.error;   // narrowed both ways
```

They can also be `null` presence, via *optional discriminants*:

```ts
type Loaded = { data: string[]; error?: never };
type Failed = { data?: never; error: Error };
type State = Loaded | Failed;
```

---

## 5.4 Every narrowing mechanism

Narrowing is control-flow analysis: TypeScript tracks the type of each variable *per
program point*. Every mechanism below corresponds to a real JavaScript check.

```ts
declare const x: string | number | boolean | null | undefined | string[] | Date;

// typeof
if (typeof x === 'string') x.toUpperCase();
if (typeof x === 'number') x.toFixed();
if (typeof x === 'boolean') x.valueOf();
if (typeof x === 'object') { /* string[] | Date | null — note null! */ }
if (typeof x === 'undefined') { /* undefined */ }

// truthiness (careful: '' and 0 and NaN are falsy)
if (x) { /* excludes null, undefined, false, '', 0 */ }

// equality / identity
if (x === null) {}
if (x == null) { /* null | undefined — the one place == is idiomatic */ }
if (x !== undefined) {}

// instanceof
if (x instanceof Date) x.toISOString();

// Array.isArray
if (Array.isArray(x)) x.length;

// `in` operator
type A = { a: string }; type B = { b: string };
declare const ab: A | B;
if ('a' in ab) ab.a; else ab.b;

// discriminant property
declare const shape: { kind: 'c'; r: number } | { kind: 's'; side: number };
if (shape.kind === 'c') shape.r;

// user-defined predicate
declare function isDate(v: unknown): v is Date;
if (isDate(x)) x.getTime();

// assertion function
declare function assertString(v: unknown): asserts v is string;
assertString(x); x.length;

// discriminated by a literal in an array/tuple position
declare const t: ['ok', number] | ['err', Error];
if (t[0] === 'ok') t[1].toFixed();
```

### Control-flow subtleties

**Assignment narrows:**

```ts
let v: string | number = 'a';
v.toUpperCase();     // ✓ narrowed to string by the initialiser
v = 1;
v.toFixed();         // ✓ now number
```

**Narrowing is lost across a closure boundary** if the variable is `let`/`var` and could
be reassigned:

```ts
let s: string | null = 'a';
if (s !== null) {
  setTimeout(() => s.length, 0);   // ✗ 's' is possibly 'null' — the callback runs later
}

const s2: string | null = 'a';
if (s2 !== null) {
  setTimeout(() => s2.length, 0);  // ✓ const cannot be reassigned
}
```

**Narrowing does not survive a function call** on mutable properties:

```ts
type Box = { v: string | null };
declare function sideEffect(): void;
function f(b: Box) {
  if (b.v !== null) {
    sideEffect();      // could have set b.v = null
    b.v.length;        // ✓ TS still allows this — a known unsoundness
  }
}
```

TS resets property narrowing on *assignment* to the object, not on arbitrary calls.
Copy to a local when it matters: `const v = b.v; if (v !== null) …`.

**Aliased conditions (TS 4.4):** a `const` boolean holding a narrowing check works.

```ts
declare const val: string | number;
const isStr = typeof val === 'string';
if (isStr) val.toUpperCase();   // ✓ since 4.4
```

**Destructured discriminants (TS 4.6):**

```ts
declare const action: { type: 'add'; n: number } | { type: 'reset' };
const { type, ...rest } = action;
if (type === 'add') { /* narrowing of `rest` works in 4.6+ for the destructured form */ }
// the reliable form remains: if (action.type === 'add') action.n
```

---

## 5.5 Exhaustiveness checking

The payoff of discriminated unions. Put `never` in the default branch:

```ts
function assertNever(value: never, message = 'Unexpected variant'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
```

Now adding a variant produces a **build error at every switch that forgot it**, rather
than a runtime surprise:

```ts
type Shape =
  | { kind: 'circle'; r: number }
  | { kind: 'square'; side: number }
  | { kind: 'tri'; base: number; h: number };   // ← newly added

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.r ** 2;
    case 'square': return s.side ** 2;
    default: return assertNever(s);
    // ✗ Argument of type '{ kind: "tri"; … }' is not assignable to parameter of type 'never'
  }
}
```

The expression form, for exhaustive maps without a switch:

```ts
const AREA: { [K in Shape['kind']]: (s: Extract<Shape, { kind: K }>) => number } = {
  circle: (s) => Math.PI * s.r ** 2,
  square: (s) => s.side ** 2,
  tri:    (s) => (s.base * s.h) / 2,
};   // missing a key → compile error
```

Also turn on `noFallthroughCasesInSwitch` and `noImplicitReturns`.

---

## 5.6 Working with unions: `Extract`, `Exclude`, and lookups

```ts
type Action =
  | { type: 'add'; payload: number }
  | { type: 'remove'; payload: string }
  | { type: 'clear' };

type ActionType = Action['type'];                       // 'add' | 'remove' | 'clear'
type AddAction = Extract<Action, { type: 'add' }>;      // the 'add' member
type NonClear = Exclude<Action, { type: 'clear' }>;     // the other two

// map a discriminant to its member — the reducer pattern
type ByType = { [A in Action as A['type']]: A };
type Add = ByType['add'];     // { type: 'add'; payload: number }

// payload of a specific action
type PayloadOf<T extends ActionType> = Extract<Action, { type: T }> extends { payload: infer P }
  ? P
  : never;
type P1 = PayloadOf<'add'>;      // number
type P2 = PayloadOf<'clear'>;    // never
```

This is exactly how a typed Redux/`useReducer` dispatch is built — see
[ch. 16](16-framework-typing.md).

---

## 5.7 Union pitfalls

**Union of arrays vs array of unions:**

```ts
type A1 = string[] | number[];      // homogeneous: all strings OR all numbers
type A2 = (string | number)[];      // mixed allowed

declare const a1: A1;
a1.map((x) => x);   // ✗ signatures are not compatible — TS cannot pick one `map`
[...a1].map((x) => x);   // ✓ workaround: spread widens to (string|number)[]
```

**Optional chaining narrows, but only the accessed path:**

```ts
declare const user: { profile?: { name: string } };
if (user.profile?.name) {
  user.profile.name.trim();   // ✓ narrowed
}
```

**Unions explode combinatorially.** A union of 3 objects each with a 3-member union
property is fine; nesting these a few levels deep hits the checker's limits and turns
into "Expression produces a union type that is too complex to represent". Flatten the
model when that happens.

**`boolean` is a union.** This surprises people in mapped/conditional types:

```ts
type IsTrue<T> = T extends true ? 'y' : 'n';
type R = IsTrue<boolean>;    // 'y' | 'n' — because boolean = true | false, and it distributes
```

**Next:** [6. Generics →](06-generics.md)
