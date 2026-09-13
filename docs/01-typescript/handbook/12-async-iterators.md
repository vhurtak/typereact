# 12. Async, promises, iterators

## 12.1 Promises

```ts
const p1: Promise<string> = Promise.resolve('a');
const p2 = new Promise<number>((resolve, reject) => { resolve(1); });

async function load(id: string): Promise<User> {
  const res = await fetch(`/users/${id}`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json() as Promise<User>;   // ⚠ `json()` returns Promise<any> — see 12.6
}
```

An `async` function always returns `Promise<T>`; returning a promise does not nest:

```ts
async function f(): Promise<string> { return Promise.resolve('a'); }   // ✓ not Promise<Promise<string>>
type R = Awaited<ReturnType<typeof f>>;   // string
```

`await` on a non-promise is legal and returns the value:

```ts
const v = await 42;   // number
```

### `Promise.all`, `allSettled`, `race`, `any`

```ts
// tuple in → tuple out, preserved by the homomorphic mapped type in lib.es2015
const [user, posts] = await Promise.all([
  fetchUser('1'),        // Promise<User>
  fetchPosts('1'),       // Promise<Post[]>
]);   // user: User, posts: Post[]  ✓

// allSettled gives a discriminated union per element
const results = await Promise.allSettled([fetchUser('1'), fetchUser('2')]);
for (const r of results) {
  if (r.status === 'fulfilled') r.value;   // User
  else r.reason;                            // any (rejections are untyped)
}

const first = await Promise.race([fetchUser('1'), timeout(1000)]);
const anyOk = await Promise.any([a(), b()]);   // rejects with AggregateError
```

`as const` on the array is sometimes needed to keep the tuple:

```ts
const tasks = [fetchUser('1'), fetchPosts('1')] as const;
const [u, ps] = await Promise.all(tasks);
```

---

## 12.2 Typed errors: TypeScript cannot type `throw`

There is no `throws` clause. Every catch is `unknown` (with
`useUnknownInCatchVariables`, part of `strict`).

```ts
try {
  risky();
} catch (e) {          // e: unknown
  if (e instanceof HttpError) e.status;
  else if (e instanceof Error) e.message;
  else console.error(String(e));
}
```

Which is the whole argument for **errors as values**:

```ts
type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

const ok  = <T, E = never>(value: T): Result<T, E> => ({ ok: true, value });
const err = <E, T = never>(error: E): Result<T, E> => ({ ok: false, error });

async function attemptAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try { return ok(await fn()); }
  catch (e) { return err(e instanceof Error ? e : new Error(String(e))); }
}

const r = await attemptAsync(() => load('1'));
if (r.ok) r.value.name; else r.error.message;   // both branches typed, no try/catch
```

With a typed error union you get exhaustiveness for failure modes too:

```ts
type LoadError =
  | { kind: 'network'; cause: unknown }
  | { kind: 'notFound'; id: string }
  | { kind: 'parse'; issues: string[] };

declare function load2(id: string): Promise<Result<User, LoadError>>;
const r2 = await load2('1');
if (!r2.ok) {
  switch (r2.error.kind) {
    case 'network':  break;
    case 'notFound': break;
    case 'parse':    break;
    default: assertNever(r2.error);
  }
}
```

---

## 12.3 Cancellation: `AbortController`

The typing that matters in every typeahead/search feature:

```ts
async function search(query: string, signal: AbortSignal): Promise<Product[]> {
  const res = await fetch(`/search?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Product[];
}

// caller — cancel the previous request on each keystroke
let controller: AbortController | undefined;

function onInput(query: string): void {
  controller?.abort();
  controller = new AbortController();
  search(query, controller.signal)
    .then(render)
    .catch((e: unknown) => {
      if (e instanceof DOMException && e.name === 'AbortError') return;   // expected
      throw e;
    });
}
```

`AbortSignal.timeout(ms)` and `AbortSignal.any([a, b])` are both typed in `lib.dom` /
recent `@types/node`, and are usually better than hand-rolled timers.

---

## 12.4 Iterators and iterables

```ts
interface Iterator<T, TReturn = any, TNext = undefined> {
  next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
  return?(value?: TReturn): IteratorResult<T, TReturn>;
  throw?(e?: any): IteratorResult<T, TReturn>;
}

interface Iterable<T> { [Symbol.iterator](): Iterator<T> }
interface IterableIterator<T> extends Iterator<T> { [Symbol.iterator](): IterableIterator<T> }
```

Implementing one:

```ts
class Range implements Iterable<number> {
  constructor(private from: number, private to: number) {}
  *[Symbol.iterator](): Iterator<number> {
    for (let i = this.from; i < this.to; i++) yield i;
  }
}
for (const n of new Range(0, 3)) console.log(n);   // n: number
[...new Range(0, 3)];   // number[]
```

**Take `Iterable<T>` in function parameters** rather than `T[]` when you only iterate —
callers can then pass arrays, `Set`, `Map`, generators, `NodeList`:

```ts
function sum(xs: Iterable<number>): number {
  let total = 0;
  for (const x of xs) total += x;
  return total;
}
sum([1, 2]); sum(new Set([1, 2])); sum(new Range(0, 3));   // all ✓
```

`downlevelIteration` is required if you target ES5 and spread/iterate non-arrays.

---

## 12.5 Generators

```ts
// Generator<Yield, Return, Next>
function* counter(): Generator<number, string, boolean> {
  let i = 0;
  while (true) {
    const shouldStop = yield i++;     // shouldStop: boolean — the TNext parameter
    if (shouldStop) return 'done';    // the TReturn parameter
  }
}

const g = counter();
g.next();       // { value: 0, done: false }
g.next(false);  // { value: 1, done: false }
g.next(true);   // { value: 'done', done: true }
```

`IteratorResult<T, TReturn>` is a discriminated union on `done`, so narrowing works:

```ts
const r = g.next();
if (!r.done) r.value.toFixed();   // number
else r.value.toUpperCase();       // string
```

Async generators — the right shape for streaming and pagination:

```ts
async function* paginate<T>(url: string): AsyncGenerator<T, void, undefined> {
  let next: string | null = url;
  while (next) {
    const res = await fetch(next);
    const page: { items: T[]; next: string | null } = await res.json();
    yield* page.items;
    next = page.next;
  }
}

for await (const item of paginate<Product>('/api/products')) {
  console.log(item.name);   // ✓ typed
}
```

`yield*` delegates and takes the inner generator's `TReturn` as its value.

---

## 12.6 Typing the network boundary

`res.json()` is `Promise<any>`. Every `as` at that boundary is a lie you have chosen to
believe. Three options, worst to best:

```ts
// 1. assert — zero runtime safety
const u = (await res.json()) as User;

// 2. unknown + a hand-written guard — safe, verbose, drifts from the type
const raw: unknown = await res.json();
if (!isUser(raw)) throw new Error('bad payload');

// 3. a schema, with the type DERIVED from it — one source of truth
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
});
type User = z.infer<typeof UserSchema>;    // ← the type comes from the validator

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/users/${id}`);
  return UserSchema.parse(await res.json());   // throws on mismatch, returns User
}
```

Option 3 is the senior answer. The type and the runtime check cannot drift, because one
generates the other.

A typed `fetch` wrapper, for completeness:

```ts
async function api<S extends { parse(v: unknown): unknown }>(
  url: string,
  schema: S,
  init?: RequestInit
): Promise<ReturnType<S['parse']>> {
  const res = await fetch(url, init);
  if (!res.ok) throw new HttpError(res.status, url);
  return schema.parse(await res.json()) as ReturnType<S['parse']>;
}
```

---

## 12.7 Timers, and the Node/DOM `setTimeout` clash

`setTimeout` returns `number` in the DOM and `NodeJS.Timeout` in Node. Including both
libs makes the union ambiguous. The portable idiom:

```ts
let timer: ReturnType<typeof setTimeout> | undefined;

function debounce(fn: () => void, ms: number): () => void {
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}
```

If you get `Type 'Timeout' is not assignable to type 'number'`, the fix is
`ReturnType<typeof setTimeout>` — never `as number`.

---

## 12.8 A typed async queue (worked example)

Pulls together generics, unions, and cancellation:

```ts
type Task<T> = () => Promise<T>;

class Queue {
  private running = 0;
  private pending: Array<() => void> = [];

  constructor(private readonly concurrency: number) {}

  async run<T>(task: Task<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (this.running >= this.concurrency) {
      await new Promise<void>((resolve) => this.pending.push(resolve));
    }
    this.running++;
    try {
      return await task();
    } finally {
      this.running--;
      this.pending.shift()?.();
    }
  }
}

const q = new Queue(3);
const user = await q.run(() => fetchUser('1'));   // User ✓ — T flows through
```

**Next:** [13. tsconfig and the compiler →](13-tsconfig-compiler.md)
