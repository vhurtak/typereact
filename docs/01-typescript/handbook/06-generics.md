# 6. Generics

A generic is a **function at the type level**: it takes types as arguments and returns
a type. Everything in chapters 7–9 is built from that idea.

## 6.1 The basics

```ts
function identity<T>(value: T): T { return value; }

identity<string>('a');   // explicit
identity('a');           // inferred: T = 'a' (literal, because the param is a value position)

type Box<T> = { value: T };
interface Repo<T> { find(id: string): T | undefined }
class Stack<T> { private items: T[] = []; push(x: T) { this.items.push(x); } }
type Fn<A, R> = (a: A) => R;
```

The rule of thumb for whether a type parameter is justified: **a type parameter must
appear at least twice.** Once is a disguised `any` or a disguised cast.

```ts
// ✗ T appears once — this is just `(x: unknown) => void` with extra steps
function bad<T>(x: T): void {}

// ✗ T appears once in the return — this is a cast, and it lies
function parse<T>(json: string): T { return JSON.parse(json); }
const n = parse<number>('"actually a string"');   // n: number. Wrong at runtime.

// ✓ T relates input to output
function first<T>(items: readonly T[]): T | undefined { return items[0]; }
```

---

## 6.2 Constraints

`extends` restricts what a type parameter can be, and gives you access to members
inside the body.

```ts
function len<T extends { length: number }>(x: T): number { return x.length; }
len('abc');       // ✓ 3
len([1, 2]);      // ✓ 2
len(42);          // ✗ number does not satisfy { length: number }
```

The critical pair, `keyof` + indexed access:

```ts
function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const users = [{ id: '1', age: 30 }];
pluck(users, 'age');   // number[]
pluck(users, 'nope');  // ✗ '"nope"' is not assignable to '"id" | "age"'
```

Common constraint vocabulary:

```ts
<T extends string>                  // string-ish
<T extends readonly unknown[]>      // any array/tuple
<T extends (...args: any[]) => any> // any function
<T extends abstract new (...a: any[]) => any>  // any class (incl. abstract)
<T extends object>                  // any non-primitive
<T extends Record<string, unknown>> // an object with string keys
<T extends keyof U>                 // a key of another parameter
<T extends PropertyKey>             // string | number | symbol
```

A constrained parameter is **not** its constraint inside the body — this is the #1
generics error:

```ts
function f<T extends { a: string }>(x: T): T {
  return { a: 'new' };   // ✗ '{ a: string }' is not assignable to 'T'
                         //   T could be { a: string; b: number }
}
function g<T extends { a: string }>(x: T): T {
  return { ...x, a: 'new' };   // ✓ spread preserves T's other members
}
```

---

## 6.3 Defaults

```ts
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
type Dict<V, K extends string = string> = Record<K, V>;

interface Props<T = unknown> { data: T }
const p: Props = { data: 1 };   // T defaults to unknown
```

Defaults may reference earlier parameters:

```ts
type Pair<A, B = A> = [A, B];
type P = Pair<string>;    // [string, string]
```

Defaults are **not** constraints — they only supply a value when the argument is
omitted. Combine both:

```ts
type Handler<E extends Event = Event> = (e: E) => void;
```

---

## 6.4 Inference: where the compiler gets `T` from

Inference happens at **inference sites**: argument positions, contextual return
positions, and `infer` in conditional types. Rough algorithm: collect candidates from
each site, then pick a best common supertype.

```ts
declare function pick<T>(a: T, b: T): T;
pick('a', 'b');      // T = string     (candidates 'a','b' → widened union base)
pick('a', 1);        // T = string | number
```

**Priority:** an explicit type argument beats inference; a contextual type beats a
literal; and later parameters can influence earlier ones.

Controlling widening:

```ts
declare function f1<T>(x: T): T;
f1('a');                 // 'a'  — no constraint, literal preserved in a fresh position
declare function f2<T extends string>(x: T): T;
f2('a');                 // 'a'
declare function f3<T>(x: T[]): T;
f3(['a', 'b']);          // string — array positions widen
declare function f4<const T>(x: T): T;    // TS 5.0
f4(['a', 'b']);          // readonly ['a', 'b']
```

### Forcing or blocking inference

`NoInfer<T>` (TS 5.4) removes a site from the candidate set:

```ts
function withDefault<T>(items: T[], fallback: NoInfer<T>): T {
  return items[0] ?? fallback;
}
withDefault(['a', 'b'], 'c');    // T inferred from items only → string
withDefault([1, 2], 'c');        // ✗ correctly rejected
```

Before 5.4, the idiom was an intersection trick:

```ts
type NoInferOld<T> = [T][T extends any ? 0 : never];
```

### Inference from return position

```ts
declare function create<T>(): T[];
const xs: string[] = create();   // T = string, inferred backwards from the annotation
```

### Partial type argument inference — the workaround

TypeScript is all-or-nothing: specify one type argument and you must specify them all.
The idiom is a curried function:

```ts
// ✗ cannot do this
declare function convert<From, To>(x: From): To;
// convert<string>(…)   ← would require To as well

// ✓ curry
const convertFrom = <From,>() => <To,>(x: From, f: (v: From) => To): To => f(x);
convertFrom<string>()('a', (s) => s.length);   // To inferred = number
```

---

## 6.5 Variadic tuple types

The feature that makes higher-order function typing possible (TS 4.0+).

```ts
type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;
type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : never;
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;
type Concat<A extends readonly unknown[], B extends readonly unknown[]> = [...A, ...B];
type Length<T extends readonly unknown[]> = T['length'];

type H = Head<[1, 2, 3]>;         // 1
type T2 = Tail<[1, 2, 3]>;        // [2, 3]
type L = Last<[1, 2, 3]>;         // 3
type C = Concat<[1], [2, 3]>;     // [1, 2, 3]
type N = Length<[1, 2, 3]>;       // 3
```

Applied to functions:

```ts
// preserve a full signature through a wrapper
function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A): void => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// partial application, typed
function partial<A extends unknown[], B extends unknown[], R>(
  fn: (...args: [...A, ...B]) => R,
  ...bound: A
): (...rest: B) => R {
  return (...rest) => fn(...bound, ...rest);
}
const add3 = (a: number, b: number, c: number) => a + b + c;
const add1and2 = partial(add3, 1, 2);
add1and2(3);      // ✓ number
add1and2('3');    // ✗

// drop the `this` parameter
type Unbound<F> = F extends (this: any, ...args: infer A) => infer R ? (...args: A) => R : never;
```

Tuples as counters — this is how type-level arithmetic works (see ch. 7):

```ts
type BuildTuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>;

type Add<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]['length'];

type Five = Add<2, 3>;   // 5
```

---

## 6.6 Generic classes and methods

```ts
class Store<S, A extends { type: string }> {
  private listeners = new Set<(s: S) => void>();

  constructor(private state: S, private reducer: (s: S, a: A) => S) {}

  getState(): S { return this.state; }

  dispatch(action: A): void {
    this.state = this.reducer(this.state, action);
    this.listeners.forEach((l) => l(this.state));
  }

  subscribe(listener: (s: S) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // a method-level parameter, independent of the class parameters
  select<R>(selector: (s: S) => R): R { return selector(this.state); }
}
```

Class type parameters are **not** available on static members (there is no instance to
infer them from):

```ts
class Box<T> {
  static make<U>(v: U): Box<U> { return new Box(v); }   // ✓ own parameter
  static bad: T;                                        // ✗ Static members cannot reference class type parameters
  constructor(public value: T) {}
}
```

A generic class is structurally compared parameter-by-parameter:

```ts
declare const bs: Box<string>;
const bu: Box<unknown> = bs;   // ✓ (property covariance)
```

---

## 6.7 Generic constraints that reference each other

```ts
// a fully typed `get(obj, key)` and `set(obj, key, value)`
function get<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
function set<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): void {
  obj[key] = value;
}

// a key whose value matches a type
type KeysMatching<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];

function incr<T, K extends KeysMatching<T, number>>(obj: T, key: K): void {
  (obj[key] as number)++;
}
const rec = { count: 0, name: 'x' };
incr(rec, 'count');   // ✓
incr(rec, 'name');    // ✗
```

Two-parameter relationships also give you typed event emitters:

```ts
type EventMap = { click: { x: number; y: number }; close: void };

class Emitter<M extends Record<string, unknown>> {
  private handlers: { [K in keyof M]?: Array<(payload: M[K]) => void> } = {};

  on<K extends keyof M>(event: K, fn: (payload: M[K]) => void): void {
    (this.handlers[event] ??= []).push(fn);
  }
  emit<K extends keyof M>(event: K, payload: M[K]): void {
    this.handlers[event]?.forEach((fn) => fn(payload));
  }
}

const e = new Emitter<EventMap>();
e.on('click', (p) => p.x);       // ✓ p inferred
e.on('click', (p) => p.nope);    // ✗
e.emit('close', undefined);      // ✓
e.emit('close', 1);              // ✗
```

---

## 6.8 Generic React/Angular-flavoured examples

```ts
// a typed hook returning a tuple
function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] { … }

// a component generic in its row type
type TableProps<Row> = {
  rows: readonly Row[];
  columns: ReadonlyArray<{ key: keyof Row & string; header: string }>;
  onSelect?: (row: Row) => void;
};

// a generic that requires two props to agree
type Select<T> = {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  getKey: (v: T) => string;
};
```

Because the type parameter appears in several props, the compiler enforces that
`options`, `value` and `onChange` all talk about the *same* `T` — which is exactly the
bug class generics are for.

---

## 6.9 Pitfalls

```ts
// 1. Generic used once = a cast in disguise (see 6.1)

// 2. Constraint ≠ the type inside the body (see 6.2)

// 3. Over-genericising. If callers always pass the same type, don't parameterise.

// 4. `T extends any[]` vs `readonly unknown[]`: prefer readonly + unknown
//    — `any[]` re-enables `any` inside the body.

// 5. Inference through unions of functions fails; overloads infer from the LAST
//    signature when used as a value.

// 6. Deeply recursive generics hit the 50-level instantiation depth cap:
//    "Type instantiation is excessively deep and possibly infinite."
//    Fix: use tail-recursive accumulator form (see ch. 7), or bound the depth.
```

**Next:** [7. Conditional types →](07-conditional-types.md)
