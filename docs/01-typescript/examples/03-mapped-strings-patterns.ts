/**
 * Lesson 3 — Mapped types, template literal types, and the patterns built from them.
 *
 *     npm run lesson:check
 */
import type { Equals, Expect } from './_assert';

/* ------------------------------------------------------------------ *
 * 1. Mapped types and modifiers
 * ------------------------------------------------------------------ */

type User = { id: string; age: number; email?: string };

type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

type _1 = Expect<Equals<MyPartial<{ a: string }>, { a?: string }>>;
// -? strips `undefined` from the value type as well as the optionality
type _2 = Expect<Equals<MyRequired<{ a?: string }>, { a: string }>>;
type _3 = Expect<Equals<Mutable<{ readonly a: string }>, { a: string }>>;

/* ------------------------------------------------------------------ *
 * 2. Homomorphic mapped types preserve arrays, tuples and modifiers
 * ------------------------------------------------------------------ */

// The exact form `{ [K in keyof T]: … }` is homomorphic.
type Boxed<T> = { [K in keyof T]: { value: T[K] } };
type _4 = Expect<Equals<Boxed<[string, number]>, [{ value: string }, { value: number }]>>;
type _5 = Expect<Equals<Boxed<string[]>, { value: string }[]>>;

// It also preserves readonly/optional through the map:
type _6 = Expect<Equals<Boxed<{ readonly a?: string }>, { readonly a?: { value: string | undefined } }>>;

// Adding `as` breaks homomorphy — the tuple becomes an object with numeric-ish keys.
type NonHomo<T> = { [K in keyof T as K]: T[K] };
type _7 = Expect<Equals<NonHomo<[string]>, [string]>>;   // still a tuple here, but…
type _8 = Expect<Equals<Boxed<readonly [1]>, readonly [{ value: 1 }]>>;

/* ------------------------------------------------------------------ *
 * 3. Key remapping: `never` deletes a key
 * ------------------------------------------------------------------ */

type PickByType<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };
type OmitByType<T, V> = { [K in keyof T as T[K] extends V ? never : K]: T[K] };

type Mixed = { a: string; b: number; c: string };
type _9 = Expect<Equals<PickByType<Mixed, string>, { a: string; c: string }>>;
type _10 = Expect<Equals<OmitByType<Mixed, string>, { b: number }>>;

// Getters — remapping with a template literal + Capitalize
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
type _11 = Expect<Equals<Getters<{ name: string }>, { getName: () => string }>>;

/* ------------------------------------------------------------------ *
 * 4. Remapping a UNION of objects — the registry / reducer pattern
 * ------------------------------------------------------------------ */

type Action =
  | { type: 'add'; n: number }
  | { type: 'del'; id: string }
  | { type: 'clear' };

type ActionByType = { [A in Action as A['type']]: A };
type _12 = Expect<Equals<ActionByType['add'], { type: 'add'; n: number }>>;

// A handler map where each callback is narrowed to its own variant. Omitting a key is
// a compile error — which is the point.
type Handlers = { [A in Action as A['type']]: (action: A) => void };
const handlers: Handlers = {
  add: (a) => void a.n,      // a is the 'add' member only
  del: (a) => void a.id,
  clear: () => {},
};
void handlers;

// @ts-expect-error — Property 'clear' is missing in type '{ add; del; }'
const incomplete: Handlers = {
  add: () => {},
  del: () => {},
};
void incomplete;

/* ------------------------------------------------------------------ *
 * 5. Template literal types
 * ------------------------------------------------------------------ */

type Lang = 'en' | 'de';
type Region = 'US' | 'GB';
// every union in every slot forms a cross-product
type _13 = Expect<Equals<`${Lang}-${Region}`, 'en-US' | 'en-GB' | 'de-US' | 'de-GB'>>;

type Px = `${number}px`;
const good: Px = '10px';
void good;
// @ts-expect-error — '"10em"' is not assignable to type '`${number}px`'
const bad: Px = '10em';

type _14 = Expect<Equals<Uppercase<'hi'>, 'HI'>>;
type _15 = Expect<Equals<Capitalize<'hi'>, 'Hi'>>;

/* ------------------------------------------------------------------ *
 * 6. String pattern matching → a typed router
 * ------------------------------------------------------------------ */

type Params<S extends string> =
  S extends `${string}:${infer P}/${infer Rest}` ? P | Params<`/${Rest}`>
  : S extends `${string}:${infer P}` ? P
  : never;

type _16 = Expect<Equals<Params<'/users/:userId/posts/:postId'>, 'userId' | 'postId'>>;

type RouteParams<S extends string> = { [K in Params<S>]: string };

declare function route<S extends string>(path: S, handler: (params: RouteParams<S>) => void): void;

route('/users/:userId/posts/:postId', (p) => {
  void p.userId;
  void p.postId;
  // @ts-expect-error — Property 'nope' does not exist
  void p.nope;
});

/* ------------------------------------------------------------------ *
 * 7. Split / Join / case conversion
 * ------------------------------------------------------------------ */

type Split<S extends string, D extends string> =
  S extends `${infer H}${D}${infer R}` ? [H, ...Split<R, D>] : [S];
type _17 = Expect<Equals<Split<'a.b.c', '.'>, ['a', 'b', 'c']>>;

type SnakeToCamel<S extends string> =
  S extends `${infer H}_${infer T}` ? `${H}${Capitalize<SnakeToCamel<T>>}` : S;
type _18 = Expect<Equals<SnakeToCamel<'user_first_name'>, 'userFirstName'>>;

type CamelKeys<T> = { [K in keyof T as SnakeToCamel<string & K>]: T[K] };
type _19 = Expect<Equals<CamelKeys<{ user_id: string }>, { userId: string }>>;

/* ------------------------------------------------------------------ *
 * 8. Dotted paths — the lodash.get / i18n-key pattern
 * ------------------------------------------------------------------ */

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
type _20 = Expect<Equals<Paths<Config>, 'db' | 'db.host' | 'db.port' | 'debug'>>;
type _21 = Expect<Equals<PathValue<Config, 'db.port'>, number>>;

// note the shape: inferring P against a constraint that itself depends on T makes the
// compiler fall back to the whole `Paths<T>` union. Taking `P extends string` and
// intersecting at the parameter keeps the literal.
declare function get<T, P extends string>(obj: T, path: P & Paths<T>): PathValue<T, P>;
declare const cfg: Config;

const host = get(cfg, 'db.host');
type _22 = Expect<Equals<typeof host, string>>;
// @ts-expect-error — '"db.nope"' is not assignable to Paths<Config>
get(cfg, 'db.nope');

/* ------------------------------------------------------------------ *
 * 9. Where the built-in utility types lie to you
 * ------------------------------------------------------------------ */

// Omit does not constrain K to keyof T — typos pass silently
type Typo = Omit<User, 'emial'>;
type _23 = Expect<Equals<Typo, { id: string; age: number; email?: string }>>;

type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
// @ts-expect-error — '"emial"' is not assignable to 'keyof User'
type Caught = StrictOmit<User, 'emial'>;

// Omit/Pick/Partial are NOT distributive: they flatten discriminated unions
type Tagged = { kind: 'a'; x: number } | { kind: 'b'; y: string };
type Flattened = Omit<Tagged, 'kind'>;
// keyof a union is the INTERSECTION of its members' keys — here just 'kind' — so
// removing it leaves nothing at all. Both variants collapsed into one empty type.
type _24 = Expect<Equals<keyof Flattened, never>>;

type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;
type _25 = Expect<Equals<DistributiveOmit<Tagged, 'kind'>, { x: number } | { y: string }>>;

// Partial is shallow
const shallow: Partial<{ a: { b: string } }> = {};
void shallow;
// @ts-expect-error — 'b' is missing: `a` is optional, but if present it must be complete
const stillRequired: Partial<{ a: { b: string } }> = { a: {} };

/* ------------------------------------------------------------------ *
 * 10. Prettify — cosmetic, and the most-used private utility there is
 * ------------------------------------------------------------------ */

type Prettify<T> = { [K in keyof T]: T[K] } & {};
type Messy = { a: string } & { b: number };
// the mapped part is what does the flattening; the `& {}` only nudges the display
type _26 = Expect<Equals<{ [K in keyof Messy]: Messy[K] }, { a: string; b: number }>>;
type _26b = Expect<Equals<Prettify<Messy>['b'], number>>;
// Same type either way; the difference is that tooltips and error messages show one
// flat object instead of `A & B & C`.

/* ------------------------------------------------------------------ *
 * 11. Branded types and exhaustive registries, verified
 * ------------------------------------------------------------------ */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

type UserId = Brand<string, 'UserId'>;
type ProductId = Brand<string, 'ProductId'>;

const userId = (raw: string): UserId => raw as UserId;
const productId = (raw: string): ProductId => raw as ProductId;

declare function getProduct(id: ProductId): void;

getProduct(productId('p1'));
// @ts-expect-error — UserId is not assignable to ProductId
getProduct(userId('u1'));
// @ts-expect-error — a raw string is not assignable either
getProduct('p1');

// A brand is still usable as its underlying primitive where that makes sense:
const upper: string = productId('p1').toUpperCase();
void upper;

const CATEGORIES = ['laptops', 'phones', 'audio'] as const;
type Category = (typeof CATEGORIES)[number];
type _27 = Expect<Equals<Category, 'laptops' | 'phones' | 'audio'>>;

// satisfies gives BOTH the exhaustiveness check and the literal value types
const ICONS = {
  laptops: '💻',
  phones: '📱',
  audio: '🎧',
} satisfies Record<Category, string>;
// The keys are exact and exhaustive — but the VALUES widen to `string`, because the
// target's value type is `string` and that is the contextual type. `satisfies` stops
// the whole object from widening to Record<Category, string>; it does not make the
// target's value type more specific than you wrote it.
type _28 = Expect<Equals<typeof ICONS.laptops, string>>;
type _28b = Expect<Equals<keyof typeof ICONS, Category>>;

// If you want the literals too, make the target literal-friendly:
const ICONS_EXACT = {
  laptops: '💻',
  phones: '📱',
  audio: '🎧',
} as const satisfies Record<Category, string>;
type _28c = Expect<Equals<typeof ICONS_EXACT.laptops, '💻'>>;

// @ts-expect-error — Property 'audio' is missing
const INCOMPLETE = { laptops: '💻', phones: '📱' } satisfies Record<Category, string>;

/* ------------------------------------------------------------------ *
 * 12. AtLeastOne / XOR — mutually exclusive shapes
 * ------------------------------------------------------------------ */

type AtLeastOne<T, K extends keyof T = keyof T> =
  K extends keyof T ? Required<Pick<T, K>> & Partial<Omit<T, K>> : never;

type Filter = AtLeastOne<{ id?: string; name?: string }>;
const f1: Filter = { id: 'x' };
void f1;
// @ts-expect-error — at least one key is required
const f2: Filter = {};

type XOR<A, B> =
  | (A & { [K in Exclude<keyof B, keyof A>]?: never })
  | (B & { [K in Exclude<keyof A, keyof B>]?: never });

type Auth = XOR<{ token: string }, { apiKey: string }>;
const a1: Auth = { token: 't' };
void a1;
// @ts-expect-error — token and apiKey are mutually exclusive
const a2: Auth = { token: 't', apiKey: 'k' };

export {};
