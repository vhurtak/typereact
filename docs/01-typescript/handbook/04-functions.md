# 4. Functions

## 4.1 Ways to type a function

```ts
// declaration
function add(a: number, b: number): number { return a + b; }

// expression / arrow
const sub: (a: number, b: number) => number = (a, b) => a - b;

// type alias
type BinOp = (a: number, b: number) => number;

// interface with a call signature (can also carry properties)
interface Memoized {
  (n: number): number;
  cache: Map<number, number>;
}

// object-literal method shorthand in a type
type Api = { get(url: string): Promise<Response> };
```

When the function expression is contextually typed, parameter annotations are
redundant — this is *contextual typing* doing the work:

```ts
const sub2: BinOp = (a, b) => a - b;   // a, b inferred as number
```

---

## 4.2 Parameters: optional, default, rest

```ts
function f(a: string, b?: number, c: boolean = false, ...rest: string[]) {}
//          required   optional    default          rest

f('x');                 // ✓
f('x', undefined, true);// ✓ — optional params accept explicit undefined
f('x', 1, true, 'y', 'z');
```

- `b?: number` has type `number | undefined`.
- `c = false` is *not* optional in type terms from inside, but is optional at call sites.
- Optional parameters must follow required ones (rest is always last).
- `...rest` must be an array or tuple type.

Destructured parameters with defaults:

```ts
function connect({ host = 'localhost', port = 80 }: { host?: string; port?: number } = {}) {}
connect();                     // ✓ the `= {}` makes the whole object optional
connect({ port: 8080 });
```

Arity is checked loosely in one direction: a function with **fewer** parameters is
assignable where more are expected. This is why `arr.map(x => x)` works when `map`
passes three arguments.

```ts
type Cb = (value: string, index: number, arr: string[]) => void;
const cb: Cb = (value) => console.log(value);   // ✓ ignoring extra params is fine
const bad: (a: string, b: number) => void = (a: string) => {};   // ✓ same rule
const worse: (a: string) => void = (a: string, b: number) => {}; // ✗ too many
```

---

## 4.3 Return types

```ts
function id<T>(x: T): T { return x; }
function nothing(): void {}
function crash(): never { throw new Error(); }
async function load(): Promise<User> { … }
function* gen(): Generator<number, string, boolean> { … }
```

**Annotate exported functions.** Without it, a change in the body silently changes the
public type and the error appears in a consumer file instead of at the definition.

Inference for locals is preferable — less noise, same safety.

### `void` vs `undefined` vs `never`

```ts
function a(): void {}          // returns nothing meaningful
function b(): undefined { return undefined; }   // returns undefined specifically
function c(): never { throw 0; }                // never returns
```

The special rule: a value-returning function **is assignable** to a `void`-returning
signature, and its value is discarded. This is what makes `forEach(x => set.add(x))`
legal even though `add` returns the set.

```ts
type Handler = () => void;
const h: Handler = () => 42;   // ✓
const r = h();                 // r: void — you cannot use the 42
```

---

## 4.4 Overloads

Multiple signatures, one implementation. The implementation signature is **not**
callable and must be compatible with all overloads.

```ts
function parse(input: string): object;
function parse(input: string, reviver: (k: string, v: unknown) => unknown): object;
function parse(input: Buffer): object;
// implementation signature — invisible to callers
function parse(input: string | Buffer, reviver?: (k: string, v: unknown) => unknown): object {
  const text = typeof input === 'string' ? input : input.toString('utf8');
  return JSON.parse(text, reviver);
}
```

Resolution is **first match wins, top to bottom** — so order from most specific to
most general:

```ts
function get(key: 'port'): number;
function get(key: 'host'): string;
function get(key: string): unknown;     // fallback last
function get(key: string): unknown { … }

const p = get('port');   // number ✓
```

### When not to overload

If the return type is a simple function of the argument type, a **union parameter with
a conditional return** or a **generic** is usually better — overloads do not compose
with generics from the caller's side:

```ts
// overloads
function wrap(x: string): string[];
function wrap(x: number): number[];
function wrap(x: unknown): unknown[] { return [x]; }

declare const u: string | number;
wrap(u);   // ✗ no overload matches a union argument

// generic — works with unions
function wrap2<T>(x: T): T[] { return [x]; }
wrap2(u);  // ✓ (string | number)[]
```

Rule: overloads are for *genuinely different shapes* (different arity, different
parameter kinds), not for parameterisation.

---

## 4.5 `this` typing

`this` can be declared as a fake first parameter. It is erased.

```ts
interface Button { label: string }

function onClick(this: Button, event: Event): void {
  console.log(this.label);
}

const b: Button = { label: 'ok' };
onClick.call(b, new Event('click'));   // ✓
onClick(new Event('click'));           // ✗ 'this' context of type 'void' ...
```

Arrow functions have no `this` binding, so you cannot declare one — which is exactly
why they are the right choice for callbacks in classes.

`ThisType<T>` (needs `noImplicitThis`) types `this` inside object-literal methods —
this is how Vue's options API is typed:

```ts
type Store<S, A> = { state: S; actions: A & ThisType<S & A> };

const store = {
  state: { count: 0 },
  actions: {
    inc() { this.count++; },   // `this` is state & actions
  },
} satisfies Store<{ count: number }, { inc(): void }>;
```

Polymorphic `this` in classes returns "the current subclass", which is how fluent
builders keep their type through inheritance:

```ts
class Query {
  where(): this { return this; }
}
class UserQuery extends Query {
  byEmail(): this { return this; }
}
new UserQuery().where().byEmail();   // ✓ `where` returned UserQuery, not Query
```

---

## 4.6 Type guards, assertion functions, and predicates

A **type predicate** widens the checker's vocabulary:

```ts
function isString(x: unknown): x is string {
  return typeof x === 'string';
}

declare const v: unknown;
if (isString(v)) v.toUpperCase();   // ✓ narrowed
```

An **assertion function** narrows for the rest of the scope. Note it *requires* an
explicit type annotation on the variable holding it — a known ergonomics wart:

```ts
function assertIsString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new TypeError('not a string');
}

function use(v: unknown) {
  assertIsString(v);
  v.toUpperCase();     // ✓ narrowed for the rest of the function
}

// ✗ this form fails: "Assertions require every name in the call target to have an
// explicit type annotation."
const assertFn = assertIsString;
```

`asserts x` (no `is`) narrows away null/undefined and is how `node:assert` is typed:

```ts
function assert(condition: unknown, msg?: string): asserts condition {
  if (!condition) throw new Error(msg);
}
declare const maybe: string | null;
assert(maybe);
maybe.length;   // ✓
```

**Both are unchecked promises.** The compiler trusts the predicate; a wrong guard is a
silent lie. Guards are the right place for a schema validator (zod/valibot/typia) rather
than hand-written checks, at any real boundary.

`this is T` narrows the receiver — useful for state machines on classes:

```ts
class Conn {
  socket: Socket | null = null;
  isOpen(): this is { socket: Socket } { return this.socket !== null; }
}
const c = new Conn();
if (c.isOpen()) c.socket.send('x');   // ✓
```

---

## 4.7 Variance: the senior-signal topic

Given `Dog extends Animal`, which of these hold?

| Position | Rule | Mnemonic |
|---|---|---|
| Return type | **covariant** — `() => Dog` is assignable to `() => Animal` | you can always return something more specific |
| Parameter | **contravariant** — `(a: Animal) => void` is assignable to `(d: Dog) => void` | a handler that accepts anything can be used where a Dog-handler is wanted |
| Property (mutable) | invariant in theory, **covariant** in TS (unsound, pragmatic) | |
| `readonly` property / `readonly T[]` | covariant, and safe | |

```ts
type Animal = { name: string };
type Dog = Animal & { bark(): void };

// return: covariant ✓
const makeDog: () => Dog = () => ({ name: 'r', bark() {} });
const makeAnimal: () => Animal = makeDog;   // ✓

// parameter: contravariant
declare const handleAnimal: (a: Animal) => void;
declare const handleDog: (d: Dog) => void;
const h1: (d: Dog) => void = handleAnimal;    // ✓ contravariance
const h2: (a: Animal) => void = handleDog;    // ✗ under strictFunctionTypes
```

`h2` is rejected because someone holding an `(a: Animal) => void` may pass a Cat, and
`handleDog` would call `.bark()` on it.

### The method-vs-property bivariance hole

`strictFunctionTypes` **only applies to function-type properties**, not to method
shorthand. Methods stay bivariant for backwards compatibility with the DOM and
`Array<T>`:

```ts
interface WithMethod  { handle(x: Dog): void }      // bivariant — lenient
interface WithProp    { handle: (x: Dog) => void }  // contravariant — strict

declare const wm: WithMethod;
declare const wp: WithProp;

const m: { handle(x: Animal): void } = wm;          // ✓ allowed (bivariance)
const p: { handle: (x: Animal) => void } = wp;      // ✗ correctly rejected
```

Practical advice: **declare callbacks as properties, not methods**, when you want the
strict check. Knowing this distinction is a strong interview signal.

### Explicit variance annotations (TS 4.7)

For generic *interfaces*, you can state variance to speed up checking and document
intent. `in` = contravariant, `out` = covariant, `in out` = invariant:

```ts
interface Producer<out T> { get(): T }
interface Consumer<in T> { set(value: T): void }
interface Box<in out T> { value: T }
```

TS checks that your annotation matches how the parameter is actually used.

---

## 4.8 Function utility types

```ts
declare function f(a: string, b?: number): Promise<User>;

type P = Parameters<typeof f>;        // [a: string, b?: number]
type R = ReturnType<typeof f>;        // Promise<User>
type A = Awaited<ReturnType<typeof f>>;   // User
type T = ThisParameterType<typeof f>; // unknown
type O = OmitThisParameter<typeof f>;
type C = ConstructorParameters<typeof Date>;   // [] | [value: ...]
type I = InstanceType<typeof Date>;   // Date
```

Building higher-order functions that preserve signatures uses **variadic tuples**:

```ts
function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A): void => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

const search = debounce((query: string, page: number) => {}, 200);
search('a', 1);     // ✓ signature preserved
search('a');        // ✗ Expected 2 arguments
```

Currying, partial application, and pipe all follow the same pattern — see
[ch. 6](06-generics.md#variadic-tuple-types).

---

## 4.9 Common function-typing mistakes

```ts
// 1. any in a signature — use unknown + narrowing, or a generic
function bad(x: any): any {}
function good<T>(x: T): T { return x; }

// 2. Function as a type — it is basically any and accepts constructors
const f1: Function = () => {};
f1(1, 2, 3);            // no checking at all
const f2: (...args: unknown[]) => unknown = () => {};   // better

// 3. Object / {} as "any object" — {} means "anything except null/undefined"
const o: {} = 42;       // ✓ (!). Use Record<string, unknown> or object.

// 4. Forgetting that optional params accept undefined explicitly
declare function g(a?: string): void;
g(undefined);           // ✓ — if you need to forbid this, use an overload

// 5. Losing `this` by passing a method as a callback
class C { name = 'c'; greet() { return this.name; } }
const c = new C();
[1].map(c.greet);       // 💥 `this` is undefined at runtime; use () => c.greet()
```

**Next:** [5. Unions, intersections and narrowing →](05-unions-narrowing.md)
