/**
 * Lesson 1 — Foundations: what the type system actually IS.
 *
 * Every `@ts-expect-error` below is a claim: "this line must fail to compile".
 * If a claim is wrong, tsc reports "Unused '@ts-expect-error' directive" and the
 * lesson fails. So the file is self-verifying:
 *
 *     npx tsc -p docs/01-typescript/examples --noEmit
 */

/* ------------------------------------------------------------------ *
 * 1. Types are erased. They exist only at compile time.
 * ------------------------------------------------------------------ */

// This is the single most important sentence about TypeScript:
// TS is a *static* layer over JS. At runtime, none of it exists.
type User = { name: string };
// @ts-expect-error — a type is not a value; you cannot reference it at runtime.
const notAValue = User;

// Consequence: you can never ask "is this value a User?" directly.
// There is no `x instanceof User`. You have to inspect the shape yourself.
// That is why type guards (section 5) exist at all.

/* ------------------------------------------------------------------ *
 * 2. Structural typing ("duck typing, checked")
 * ------------------------------------------------------------------ */

// Most languages you know are NOMINAL: a Dog is a Dog because it says
// `class Dog`. TypeScript is STRUCTURAL: a type is just a description of a
// shape, and anything with that shape IS that type. Names are documentation.

type Point2D = { x: number; y: number };
type Vector2 = { x: number; y: number };

const p: Point2D = { x: 1, y: 2 };
const v: Vector2 = p; // fine — identical shapes, different names, same type

// Extra properties are fine when the value arrives through a variable...
type Named = { name: string };
const dog = { name: 'Rex', legs: 4 };
const named: Named = dog; // OK: dog has everything Named needs

// ...but NOT when you write the object literal inline. That is "excess property
// checking" — a deliberate exception to structural typing, because a fresh
// literal with an unknown key is almost always a typo.
// @ts-expect-error — 'legs' does not exist in type 'Named'
const named2: Named = { name: 'Rex', legs: 4 };

/* ------------------------------------------------------------------ *
 * 3. Branding — buying nominal typing back when you need it
 * ------------------------------------------------------------------ */

// Structural typing has one painful hole: every id in your app is `string`,
// so every id is interchangeable. This compiles and ships a bug:
declare function getProductUnsafe(id: string): void;
const someUserId = 'user_42';
getProductUnsafe(someUserId); // no error, wrong id, production incident

// The fix is a *brand*: intersect with a phantom property that exists only in
// the type world. Nothing is added at runtime — the cast is the whole trick.
type ProductId = string & { readonly __brand: 'ProductId' };
type UserId = string & { readonly __brand: 'UserId' };

const productId = (raw: string): ProductId => raw as ProductId;
const userId = (raw: string): UserId => raw as UserId;

declare function getProduct(id: ProductId): void;

getProduct(productId('p_1')); // OK
// @ts-expect-error — UserId is not assignable to ProductId
getProduct(userId('u_1'));
// @ts-expect-error — a raw string is not assignable either
getProduct('p_1');

// But a ProductId is still a string wherever that is genuinely useful:
const upper: string = productId('p_1').toUpperCase();

// ^ this is `packages/core/src/types.ts` — the same pattern, in the real code.

/* ------------------------------------------------------------------ *
 * 4. The top and bottom of the type lattice: any / unknown / never
 * ------------------------------------------------------------------ */

// Think of types as SETS of values, and assignability as "is a subset of".
//
//   never  = the empty set        (no value has this type)
//   unknown = the set of all values (the honest top type)
//   any    = not a set at all — it switches the checker off, in both directions

// `unknown`: you may hold it, you may not use it until you prove what it is.
function lengthOfUnknown(x: unknown): number {
  // @ts-expect-error — Object is of type 'unknown'
  x.length;
  if (typeof x === 'string') return x.length; // narrowed to string: allowed
  return 0;
}

// `any`: assignable to and from everything. It is contagious — one `any` in a
// chain silently disables checking for everything downstream of it.
const anything: any = JSON.parse('{}');
const nowUnchecked: number = anything; // no error. This is the danger.
anything.whatever.deeply.nested(); // no error. Crashes at runtime.

// `never`: the empty set. Nothing is assignable TO it, and it is assignable to
// everything (vacuously). Two practical jobs:

// (a) a function that never returns normally
function fail(message: string): never {
  throw new Error(message);
}

// (b) exhaustiveness checking — the payoff comes in section 6
declare const impossible: never;
const alsoAString: string = impossible; // legal: never is a subtype of all types

/* ------------------------------------------------------------------ *
 * 5. Narrowing: how the compiler follows your control flow
 * ------------------------------------------------------------------ */

// TS models the type of a variable *per code path*. Every narrowing tool is
// just a JS runtime check the compiler happens to understand.

function describe(x: string | number | Date | null): string {
  if (x === null) return 'null';               // equality narrowing
  if (typeof x === 'string') return x.trim();   // typeof narrowing
  if (x instanceof Date) return x.toISOString(); // instanceof narrowing
  return x.toFixed(2);                          // by elimination: number
}

// `in` narrowing, for unions of object shapes without a common tag:
type Circle = { radius: number };
type Square = { side: number };
function area(s: Circle | Square): number {
  return 'radius' in s ? Math.PI * s.radius ** 2 : s.side ** 2;
}

// A user-defined type guard: `x is Foo` teaches the compiler a rule it cannot
// infer. Note it is an UNCHECKED PROMISE — the compiler trusts your predicate,
// so a wrong guard is a silent lie. This is where `unknown` from an API call
// becomes a domain type.
function isProduct(x: unknown): x is { id: string; priceCents: number } {
  return (
    typeof x === 'object' &&
    x !== null &&
    'id' in x &&
    typeof (x as Record<string, unknown>).id === 'string' &&
    typeof (x as Record<string, unknown>).priceCents === 'number'
  );
}

function priceOf(raw: unknown): number {
  if (!isProduct(raw)) throw new Error('not a product');
  return raw.priceCents; // narrowed
}

/* ------------------------------------------------------------------ *
 * 6. Discriminated unions — make illegal states unrepresentable
 * ------------------------------------------------------------------ */

// The bad version. Four independent booleans = 2^4 = 16 states, of which only
// about 4 are meaningful. "loading AND error AND has data" compiles fine.
type BadState<T> = {
  isIdle: boolean;
  isLoading: boolean;
  isError: boolean;
  data?: T;
  error?: Error;
};

// The good version: one literal-typed field (the *discriminant*) that the
// compiler can switch on. Exactly 4 states exist, and `data` only exists in the
// one state where it is meaningful.
type RemoteData<T, E = Error> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: E };

function render(state: RemoteData<string[]>): string {
  switch (state.status) {
    case 'idle':
      // @ts-expect-error — 'data' does not exist on the 'idle' member
      return state.data.join();
    case 'loading':
      return 'spinner';
    case 'success':
      return state.data.join(', '); // `data` is available here and only here
    case 'error':
      return state.error.message;
    default:
      // `state` has been narrowed to `never`: every case is handled.
      // Add a 5th variant to RemoteData and THIS LINE becomes the build error
      // that points you at every switch you forgot to update.
      return assertNever(state);
  }
}

function assertNever(value: never, message = 'Unexpected variant'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}

/* ------------------------------------------------------------------ *
 * 7. as / : / satisfies — three different things people confuse
 * ------------------------------------------------------------------ */

const PALETTE = { primary: '#0af', danger: '#f33' };

// (a) `as` — an ASSERTION. "Trust me." No check beyond plausibility. It lies.
const lie = {} as { primary: string; danger: string };
lie.primary.toUpperCase(); // compiles; explodes at runtime

// (b) `:` — an ANNOTATION. It checks, but it also WIDENS: the variable now has
// the declared type, and the specific keys are forgotten.
const annotated: Record<string, string> = PALETTE;
annotated.typoKey; // string — no error, the key set is lost

// (c) `satisfies` — CHECK WITHOUT WIDENING. Best of both, and the modern answer.
const palette = {
  primary: '#0af',
  danger: '#f33',
} satisfies Record<string, string>;

palette.primary.toUpperCase(); // known key, known to be string
// @ts-expect-error — 'typoKey' does not exist; the literal type is preserved
palette.typoKey;

// Where it really pays off — heterogeneous values keep their narrow types:
const config = { port: 3000, host: 'localhost' } satisfies Record<string, string | number>;
config.port.toFixed(); // number, NOT string | number

/* ------------------------------------------------------------------ *
 * 8. const assertions, and enums vs unions
 * ------------------------------------------------------------------ */

// By default TS widens literals in mutable positions, because you could reassign.
let mutable = 'laptops';        // widened to string
const immutable = 'laptops';    // stays 'laptops' — a const can never change

const arr = ['a', 'b'];         // string[]
const tuple = ['a', 'b'] as const; // readonly ['a', 'b'] — frozen, exact
// @ts-expect-error — Cannot assign to '0' because it is a read-only property
tuple[0] = 'z';

// The idiomatic "enum" in modern TS: an as-const array plus an indexed access.
// Zero runtime cost beyond the array, and the union is derived, not duplicated.
const CATEGORIES = ['laptops', 'phones', 'audio', 'wearables'] as const;
type Category = (typeof CATEGORIES)[number]; // 'laptops' | 'phones' | ...

const valid: Category = 'phones';
// @ts-expect-error — 'tablets' is not a Category
const invalid: Category = 'tablets';

// Compare with `enum`, which emits real runtime code and — for numeric enums —
// is bidirectional and accepts numbers that are not members at all.
enum Level { Low, High }
const sneaky: Level = 7 as Level; // numeric enums are barely a type

/* ------------------------------------------------------------------ *
 * 9. readonly is shallow, and it is compile-time only
 * ------------------------------------------------------------------ */

type Config = { readonly name: string; readonly tags: string[] };
const cfg: Config = { name: 'a', tags: ['x'] };
// @ts-expect-error — Cannot assign to 'name' because it is a read-only property
cfg.name = 'b';
cfg.tags.push('y'); // ALLOWED: readonly stops reassignment, not mutation

// `readonly string[]` (or ReadonlyArray) blocks the mutating methods too:
const frozen: readonly string[] = ['x'];
// @ts-expect-error — Property 'push' does not exist on type 'readonly string[]'
frozen.push('y');

// And note the assignability direction: mutable → readonly is fine, not the reverse.
const widenOk: readonly string[] = ['a', 'b'];
// @ts-expect-error — readonly string[] is not assignable to mutable string[]
const narrowBad: string[] = frozen;

/* ------------------------------------------------------------------ *
 * 10. Two strict flags this repo turns on that most codebases don't
 * ------------------------------------------------------------------ */

// noUncheckedIndexedAccess: indexing an array gives you `T | undefined`,
// because TS cannot know the index is in range. Noisy at first, catches real bugs.
const names = ['a', 'b'];
const first = names[0]; // string | undefined
// @ts-expect-error — 'first' is possibly 'undefined'
first.toUpperCase();
if (first !== undefined) first.toUpperCase(); // narrow, then use

// exactOptionalPropertyTypes: `a?: string` means "absent or a string" — NOT
// "or explicitly undefined". Distinguishes "key missing" from "key set to undefined",
// which matters the moment you serialise or spread.
type Opts = { a?: string };
const absent: Opts = {};
// @ts-expect-error — undefined is not assignable to 'string' under exactOptionalPropertyTypes
const explicitUndefined: Opts = { a: undefined };

export {};
