# 14. Patterns and recipes

Applied type design. Each pattern states the bug class it removes.

## 14.1 Branded / opaque types

**Removes:** passing the wrong id, the wrong unit, or unvalidated input.

```ts
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

type UserId    = Brand<string, 'UserId'>;
type ProductId = Brand<string, 'ProductId'>;
type Cents     = Brand<number, 'Cents'>;
type Email     = Brand<string, 'Email'>;

// constructors are the only way in — put the validation here
const userId    = (raw: string): UserId => raw as UserId;
const productId = (raw: string): ProductId => raw as ProductId;
const cents     = (n: number): Cents => Math.round(n) as Cents;

function email(raw: string): Email {
  if (!raw.includes('@')) throw new TypeError(`invalid email: ${raw}`);
  return raw as Email;   // the ONE cast, guarded by the check above
}

declare function getProduct(id: ProductId): Promise<Product>;
getProduct(productId('p1'));   // ✓
getProduct(userId('u1'));      // ✗
getProduct('p1');              // ✗
```

Using a `unique symbol` key (rather than `__brand`) means the brand cannot be forged by
writing the property, and it does not show up in `keyof`.

The parse-don't-validate version, where the type *proves* the check ran:

```ts
type Validated<T, B extends string> = Brand<T, B>;
type NonEmpty = Validated<string, 'NonEmpty'>;

function nonEmpty(s: string): Result<NonEmpty, 'empty'> {
  return s.length > 0 ? ok(s as NonEmpty) : err('empty');
}
// downstream code takes NonEmpty and can never receive an unchecked string
```

---

## 14.2 `Result<T, E>` — errors as values

**Removes:** unhandled rejections, untyped `catch`, invisible failure modes.

```ts
type Result<T, E = Error> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E };

const ok  = <T, E = never>(value: T): Result<T, E> => ({ ok: true, value });
const err = <E, T = never>(error: E): Result<T, E> => ({ ok: false, error });

const map = <T, U, E>(r: Result<T, E>, f: (v: T) => U): Result<U, E> =>
  r.ok ? ok(f(r.value)) : r;

const flatMap = <T, U, E>(r: Result<T, E>, f: (v: T) => Result<U, E>): Result<U, E> =>
  r.ok ? f(r.value) : r;

const mapErr = <T, E, F>(r: Result<T, E>, f: (e: E) => F): Result<T, F> =>
  r.ok ? r : err(f(r.error));

const unwrapOr = <T, E>(r: Result<T, E>, fallback: T): T => (r.ok ? r.value : fallback);

function attempt<T>(fn: () => T): Result<T, Error> {
  try { return ok(fn()); }
  catch (e) { return err(e instanceof Error ? e : new Error(String(e))); }
}
```

Note `map` returns `r` unchanged in the error branch — that is safe because
`Result<T, E>`'s error member does not mention `T`. Explaining *why* it type-checks is a
good interview answer.

With a typed error union, failure handling becomes exhaustive:

```ts
type CheckoutError =
  | { kind: 'outOfStock'; productId: ProductId }
  | { kind: 'paymentDeclined'; code: string }
  | { kind: 'network'; cause: unknown };

declare function checkout(cart: Cart): Promise<Result<Order, CheckoutError>>;
```

---

## 14.3 State machines with discriminated unions

**Removes:** impossible states, and transitions from the wrong state.

```ts
type State =
  | { status: 'idle' }
  | { status: 'editing'; draft: Draft }
  | { status: 'saving';  draft: Draft }
  | { status: 'saved';   id: string }
  | { status: 'failed';  draft: Draft; error: Error };

type Event =
  | { type: 'EDIT'; draft: Draft }
  | { type: 'SAVE' }
  | { type: 'SAVED'; id: string }
  | { type: 'FAILED'; error: Error }
  | { type: 'RETRY' };

// only the legal (state, event) pairs are handled — everything else returns the
// current state unchanged, and the compiler knows which fields exist in each branch
function reduce(state: State, event: Event): State {
  switch (state.status) {
    case 'idle':
      return event.type === 'EDIT' ? { status: 'editing', draft: event.draft } : state;
    case 'editing':
      if (event.type === 'SAVE') return { status: 'saving', draft: state.draft };
      if (event.type === 'EDIT') return { status: 'editing', draft: event.draft };
      return state;
    case 'saving':
      if (event.type === 'SAVED')  return { status: 'saved', id: event.id };
      if (event.type === 'FAILED') return { status: 'failed', draft: state.draft, error: event.error };
      return state;
    case 'failed':
      return event.type === 'RETRY' ? { status: 'saving', draft: state.draft } : state;
    case 'saved':
      return state;
    default:
      return assertNever(state);
  }
}
```

You can go further and encode the transition table in the type system:

```ts
type Transitions = {
  idle:    { EDIT: 'editing' };
  editing: { SAVE: 'saving'; EDIT: 'editing' };
  saving:  { SAVED: 'saved'; FAILED: 'failed' };
  failed:  { RETRY: 'saving' };
  saved:   {};
};

type NextState<S extends keyof Transitions, E extends string> =
  E extends keyof Transitions[S] ? Transitions[S][E] : never;

type T1 = NextState<'editing', 'SAVE'>;    // 'saving'
type T2 = NextState<'saved', 'SAVE'>;      // never — illegal transition, at compile time
```

---

## 14.4 Builder with compile-time completeness

**Removes:** calling `.build()` before all required fields are set.

```ts
class QueryBuilder<Set extends string = never> {
  private parts: Record<string, unknown> = {};

  from(table: string): QueryBuilder<Set | 'from'> {
    this.parts.from = table;
    return this as unknown as QueryBuilder<Set | 'from'>;
  }
  select(...cols: string[]): QueryBuilder<Set | 'select'> {
    this.parts.select = cols;
    return this as unknown as QueryBuilder<Set | 'select'>;
  }
  where(clause: string): QueryBuilder<Set | 'where'> {
    this.parts.where = clause;
    return this as unknown as QueryBuilder<Set | 'where'>;
  }

  // only callable once both 'from' and 'select' are in the accumulated union
  build(this: QueryBuilder<'from' | 'select'>): string {
    return `SELECT ${(this.parts.select as string[]).join(',')} FROM ${this.parts.from}`;
  }
}

new QueryBuilder().from('users').select('id').build();   // ✓
new QueryBuilder().from('users').build();                // ✗ 'this' context mismatch
```

The mechanism is the `this` parameter on `build` plus a phantom type parameter that
accumulates as a union.

---

## 14.5 Exhaustive registries

**Removes:** forgetting to handle a new variant somewhere.

```ts
const CATEGORIES = ['laptops', 'phones', 'audio', 'wearables'] as const;
type Category = (typeof CATEGORIES)[number];

// every key required, extra keys rejected (values widen to `string` — the target's
// value type is the contextual type; add `as const` if you need the literals)
const ICONS = {
  laptops: '💻',
  phones: '📱',
  audio: '🎧',
  wearables: '⌚',
} satisfies Record<Category, string>;

// handler map keyed by a discriminant
type Action = { type: 'add'; n: number } | { type: 'del'; id: string };

const handlers: { [A in Action as A['type']]: (a: A) => void } = {
  add: (a) => a.n,     // a is narrowed to the add member
  del: (a) => a.id,
};

function dispatch(a: Action): void {
  (handlers[a.type] as (x: Action) => void)(a);
}
```

Adding a category or an action variant now breaks the build at the registry, which is
where you want it.

---

## 14.6 Dependency injection without a framework

**Removes:** untyped service locators, and mocks that drift from the real thing.

```ts
type Services = {
  logger: { info(msg: string): void };
  clock: { now(): Date };
  repo: { find(id: string): Promise<User | undefined> };
};

// a factory that takes exactly the services it uses
function createUserService<D extends Pick<Services, 'repo' | 'logger'>>(deps: D) {
  return {
    async load(id: string): Promise<User> {
      deps.logger.info(`loading ${id}`);
      const user = await deps.repo.find(id);
      if (!user) throw new Error('not found');
      return user;
    },
  };
}

// tests get a fully typed fake — a missing method is a compile error
const svc = createUserService({
  logger: { info: () => {} },
  repo: { find: async () => ({ id: '1', name: 'a' } as User) },
});
```

The typed container version:

```ts
class Container<T extends Record<string, unknown> = {}> {
  private registry = new Map<string, unknown>();

  register<K extends string, V>(key: K, value: V): Container<T & Record<K, V>> {
    this.registry.set(key, value);
    return this as unknown as Container<T & Record<K, V>>;
  }
  get<K extends keyof T>(key: K): T[K] {
    return this.registry.get(key as string) as T[K];
  }
}

const c = new Container().register('logger', console).register('port', 3000);
c.get('port');     // number ✓
c.get('missing');  // ✗
```

---

## 14.7 Type-safe environment configuration

```ts
const ENV_SCHEMA = {
  NODE_ENV: ['development', 'production', 'test'],
  PORT: 'number',
  DATABASE_URL: 'string',
} as const;

type EnvSchema = typeof ENV_SCHEMA;
type EnvValue<S> = S extends readonly string[] ? S[number]
  : S extends 'number' ? number
  : S extends 'string' ? string
  : never;
type Env = { [K in keyof EnvSchema]: EnvValue<EnvSchema[K]> };

declare function loadEnv(): Env;

const env = loadEnv();
env.NODE_ENV;   // 'development' | 'production' | 'test'
env.PORT;       // number
```

Or, more simply, augment `ProcessEnv` (see
[11.7](11-modules-declarations.md#117-module-augmentation--the-real-world-use)).

---

## 14.8 Typed event emitter

```ts
type EventMap = {
  'user:created': { id: string };
  'user:deleted': { id: string; reason?: string };
  'app:ready': void;
};

class TypedEmitter<M extends Record<string, unknown>> {
  private handlers: { [K in keyof M]?: Set<(p: M[K]) => void> } = {};

  on<K extends keyof M>(event: K, fn: (payload: M[K]) => void): () => void {
    (this.handlers[event] ??= new Set()).add(fn);
    return () => { this.handlers[event]?.delete(fn); };
  }

  emit<K extends keyof M>(
    event: K,
    ...args: M[K] extends void ? [] : [payload: M[K]]
  ): void {
    this.handlers[event]?.forEach((fn) => fn(args[0] as M[K]));
  }
}

const bus = new TypedEmitter<EventMap>();
bus.on('user:created', (p) => p.id);   // ✓ p typed
bus.emit('app:ready');                  // ✓ no payload required
bus.emit('user:created', { id: '1' });  // ✓
bus.emit('user:created');               // ✗ payload required
```

The conditional rest-parameter tuple is what makes void-payload events ergonomic.

---

## 14.9 Immutability helpers

```ts
type DeepReadonly<T> =
  T extends (...a: any[]) => any ? T
  : T extends readonly (infer U)[] ? ReadonlyArray<DeepReadonly<U>>
  : T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>>
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

// a typed immutable update, path-aware
function update<T, K extends keyof T>(obj: T, key: K, value: T[K]): T {
  return { ...obj, [key]: value };
}
```

Take `readonly` parameters everywhere you do not mutate — it costs nothing and callers
can pass either form.

---

## 14.10 The Store, typed end to end

The pattern behind `useSyncExternalStore`, Redux, NgRx and Zustand alike:

```ts
type Listener = () => void;

function createStore<S, A extends { type: string }>(
  initial: S,
  reducer: (state: S, action: A) => S
) {
  let state = initial;
  const listeners = new Set<Listener>();

  return {
    getSnapshot: (): S => state,
    dispatch(action: A): void {
      const next = reducer(state, action);
      if (next !== state) { state = next; listeners.forEach((l) => l()); }
    },
    subscribe(l: Listener): () => void {
      listeners.add(l);
      return () => { listeners.delete(l); };
    },
    select<R>(selector: (s: S) => R): R { return selector(state); },
  };
}

type CartState = { items: Product[] };
type CartAction = { type: 'add'; product: Product } | { type: 'clear' };

const store = createStore<CartState, CartAction>({ items: [] }, (s, a) => {
  switch (a.type) {
    case 'add':   return { items: [...s.items, a.product] };
    case 'clear': return { items: [] };
    default:      return assertNever(a);
  }
});

store.dispatch({ type: 'add', product });   // ✓
store.dispatch({ type: 'nope' });           // ✗
```

Undo/redo on top is just a wrapper state — `{ past: S[]; present: S; future: S[] }` —
and the same reducer.

**Next:** [15. Reading TypeScript errors →](15-errors-decoder.md)
