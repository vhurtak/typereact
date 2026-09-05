# TypeScript for senior interviews

The bar is not "I add types". It is: can you model a domain so wrong states do not
compile, and can you read an error message from a generic three levels deep.

## 1. The type system in one page

**Structural, not nominal.** Two types with the same shape are the same type. That is
why `ProductId` in `packages/core/src/types.ts` uses a *brand* — an intersection with a
phantom property — to fake nominal typing:

```ts
type ProductId = string & { readonly __brand: 'ProductId' };
```

Without it, `getProduct(userId)` compiles happily. With it, it doesn't. Say this if
you're asked "how do you prevent mixing up two string ids?".

**`unknown` vs `any` vs `never`.**
- `any` switches the checker off and is contagious. Banned in most senior codebases.
- `unknown` is the honest top type: you must narrow before you use it. This is what
  `catch (e: unknown)` should be, and it's why `attempt()` in `result.ts` narrows with
  `e instanceof Error`.
- `never` is the bottom type: no value has it. Its practical use is exhaustiveness —
  see `assertNever` and how `Typeahead.tsx` uses it in a switch `default`.

**Union vs intersection, and the discriminated union.** The single most valuable
modelling tool. `RemoteData<T>` makes "loading with data present" unrepresentable:

```ts
type RemoteData<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };
```

Four booleans (`isLoading`, `isError`, …) allow 16 states, 12 of which are nonsense.
That sentence is a good thing to say in an interview.

## 2. Generics that come up

```ts
// Constraint + inference
function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

// Conditional + infer
type ElementOf<T> = T extends readonly (infer U)[] ? U : never;
type Awaited2<T> = T extends PromiseLike<infer U> ? Awaited2<U> : T;

// Mapped type with key remapping (TS 4.1+)
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };

// Variadic tuples — how `debounce` keeps its argument types
function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): (...args: A) => void;
```

**Distributivity** is the gotcha. `T extends U ? X : Y` distributes over a naked union
type parameter. `Exclude<'a' | 'b', 'a'>` is `'b'` because of it. Wrap in a tuple —
`[T] extends [U] ? …` — to switch it off. Interviewers love this one.

**Variance.** Function parameters are contravariant, returns covariant. With
`strictFunctionTypes` on, `(dog: Dog) => void` is not assignable to `(animal: Animal) => void`.
Method syntax (`m(x: Dog): void`) is bivariant for legacy reasons; property syntax
(`m: (x: Dog) => void`) is strict. Knowing that distinction is a strong signal.

## 3. `satisfies` — the modern answer

```ts
const config = { port: 3000, host: 'localhost' } satisfies Record<string, string | number>;
config.port.toFixed(); // still `number`, not `string | number`
```

`as` lies to the compiler, `:` widens the type, `satisfies` checks without widening.
Used in `packages/core/src/data.ts`.

## 4. tsconfig flags a senior should ask about

Beyond `strict`:

| Flag | Why it matters |
|---|---|
| `noUncheckedIndexedAccess` | `arr[0]` becomes `T \| undefined`. Catches real bugs; noisy at first. |
| `exactOptionalPropertyTypes` | `{ a?: string }` no longer accepts `{ a: undefined }`. |
| `verbatimModuleSyntax` | Forces `import type`, kills phantom runtime imports. |
| `noImplicitOverride` | Requires `override`. Used in `ErrorBoundary.tsx`. |
| `isolatedModules` | Required by every modern transpiler (esbuild/swc). |

All of these are on in `packages/core/tsconfig.json` — read it.

## 5. Type-level exercises (do these on paper)

1. Write `DeepReadonly<T>` that recurses through objects and arrays.
2. Write `DeepPartial<T>`.
3. Write `PickByType<T, U>` — keys of `T` whose value extends `U`.
4. Type a `get(obj, 'a.b.c')` so the return type is inferred from the dotted path.
5. Implement `Result<T, E>` and a `flatMap` that preserves both parameters. (Compare
   against `packages/core/src/result.ts`.)
6. Why does `[] as const` produce `readonly []` while `[] as never[]` does not?

## 6. Questions you will actually be asked

- *`interface` vs `type`?* Interfaces merge declarations and are marginally faster for
  the compiler on large object types; type aliases can express unions, tuples, mapped
  and conditional types. Use `interface` for object contracts you might extend, `type`
  for everything else. Do not claim one is "better".
- *How do you type a function that takes a callback and returns its result?*
  `function run<T>(fn: () => T): T`.
- *What's an enum, and why do people avoid it?* Numeric enums are bidirectional and emit
  runtime code; string enums are nominal in a way that surprises people. Prefer
  `as const` objects + `(typeof X)[keyof typeof X]`, or a union of literals — as
  `CATEGORIES` does in `types.ts`.
- *How do you narrow `unknown` safely?* `typeof`, `instanceof`, `in`, `Array.isArray`,
  or a user-defined type guard `(x: unknown): x is Foo`. Mention that a guard is an
  unchecked assertion — the compiler trusts your predicate.
- *Declaration merging / module augmentation?* Extending `Window`, or adding a property
  to Express's `Request` in `nest-api` — that's the real-world use.

## 7. Red flags to avoid in a live session

- Reaching for `as` when the type doesn't line up. Narrow instead, or fix the model.
- `any` in a signature. `unknown` is nearly always what you meant.
- Non-null assertion `!` scattered around. One or two with a comment is fine.
- Declaring return types nowhere. Public API return types should be explicit — it makes
  errors point at the definition instead of the call site.
