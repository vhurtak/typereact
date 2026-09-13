/**
 * Lesson 2 — Generics and conditional types.
 *
 * Self-verifying twice over:
 *   • every `Expect<Equals<X, Y>>` fails to compile if X is not exactly Y
 *   • every `@ts-expect-error` fails to compile if the line is actually fine
 *
 *     npm run lesson:check
 */
import type { Equals, Expect } from './_assert';

/* ------------------------------------------------------------------ *
 * 1. A type parameter must appear at least twice
 * ------------------------------------------------------------------ */

// This "generic" is a cast wearing a costume: T appears once, in the return, so the
// caller picks it and the compiler verifies nothing.
function parseUnsafe<T>(json: string): T {
  return JSON.parse(json) as T;
}
const nope = parseUnsafe<number>('"actually a string"');
type _1 = Expect<Equals<typeof nope, number>>;   // the TYPE says number...
// ...and the runtime value is a string. The generic bought nothing.

// A real generic relates input to output.
function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}
type _2 = Expect<Equals<ReturnType<typeof first<string>>, string | undefined>>;

/* ------------------------------------------------------------------ *
 * 2. Constraints, and why T is not its constraint
 * ------------------------------------------------------------------ */

function pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const users = [{ id: 'u1', age: 30, tags: ['a'] }];
const ages = pluck(users, 'age');
type _3 = Expect<Equals<typeof ages, number[]>>;
// @ts-expect-error — '"nope"' is not assignable to '"id" | "age" | "tags"'
pluck(users, 'nope');

// The #1 generics error: inside the body, T is NOT the constraint. A caller may pass
// a wider object, so returning the constraint's shape would silently drop members.
function updateBad<T extends { id: string }>(entity: T, id: string): T {
  // @ts-expect-error — '{ id: string; }' is not assignable to 'T'
  return { id };
}
function updateGood<T extends { id: string }>(entity: T, id: string): T {
  return { ...entity, id };   // spread preserves whatever else T has
}

/* ------------------------------------------------------------------ *
 * 3. Inference and widening at generic call sites
 * ------------------------------------------------------------------ */

declare function bare<T>(x: T): T;
declare function inArray<T>(x: T[]): T;
declare function constParam<const T>(x: T): T;   // TS 5.0

type _4 = Expect<Equals<ReturnType<typeof bare<'a'>>, 'a'>>;
const widened = inArray(['a', 'b']);
type _5 = Expect<Equals<typeof widened, string>>;         // array positions widen
const preserved = constParam(['a', 'b']);
type _6 = Expect<Equals<typeof preserved, readonly ['a', 'b']>>;   // const param does not

// NoInfer (TS 5.4) removes a site from the candidate set
function withDefault<T>(items: T[], fallback: NoInfer<T>): T {
  return items[0] ?? fallback;
}
withDefault(['a'], 'b');
// @ts-expect-error — T is fixed to string by `items`; 1 is not a string
withDefault(['a'], 1);

/* ------------------------------------------------------------------ *
 * 4. Conditional types: `extends` means "assignable to"
 * ------------------------------------------------------------------ */

type _7 = Expect<Equals<'a' extends string ? 1 : 0, 1>>;
type _8 = Expect<Equals<string extends 'a' ? 1 : 0, 0>>;
type _9 = Expect<Equals<never extends string ? 1 : 0, 1>>;   // never ⊆ everything
type _10 = Expect<Equals<any extends string ? 1 : 0, 0 | 1>>; // `any` takes BOTH branches

/* ------------------------------------------------------------------ *
 * 5. infer — pattern matching in the type language
 * ------------------------------------------------------------------ */

type ElementOf<T> = T extends readonly (infer U)[] ? U : never;
type _11 = Expect<Equals<ElementOf<string[]>, string>>;
type _12 = Expect<Equals<ElementOf<readonly [1, 2]>, 1 | 2>>;
type _13 = Expect<Equals<ElementOf<number>, never>>;

// The same variable inferred in a COVARIANT position unions...
type Co<T> = T extends { a: infer U; b: infer U } ? U : never;
type _14 = Expect<Equals<Co<{ a: string; b: number }>, string | number>>;

// ...and in a CONTRAVARIANT position intersects. That is the whole trick behind
// UnionToIntersection.
type Contra<T> = T extends { a: (x: infer U) => void; b: (x: infer U) => void } ? U : never;
type _15 = Expect<Equals<Contra<{ a: (x: string) => void; b: (x: number) => void }>, never>>;
//                                                        ^ string & number = never

type UnionToIntersection<U> =
  (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
type _16 = Expect<Equals<UnionToIntersection<{ a: 1 } | { b: 2 }>, { a: 1 } & { b: 2 }>>;

// Constrained infer (TS 4.7) — parse a numeric string literal into a number literal
type ToNumber<S extends string> = S extends `${infer N extends number}` ? N : never;
type _17 = Expect<Equals<ToNumber<'42'>, 42>>;

/* ------------------------------------------------------------------ *
 * 6. Distributivity — the gotcha
 * ------------------------------------------------------------------ */

type ToArray<T> = T extends unknown ? T[] : never;              // naked T: distributes
type ToArrayNonDist<T> = [T] extends [unknown] ? T[] : never;   // wrapped: does not

type _18 = Expect<Equals<ToArray<string | number>, string[] | number[]>>;
type _19 = Expect<Equals<ToArrayNonDist<string | number>, (string | number)[]>>;

// Exclude works BECAUSE of distribution, plus `never` vanishing from a union
type _20 = Expect<Equals<Exclude<'a' | 'b' | 'c', 'a'>, 'b' | 'c'>>;

// Consequence 1: `never` as the argument produces `never` — there is nothing to
// distribute over. This is why the naive IsNever is wrong.
type IsNeverWrong<T> = T extends never ? true : false;
type IsNever<T> = [T] extends [never] ? true : false;
type _21 = Expect<Equals<IsNeverWrong<never>, never>>;   // NOT true
type _22 = Expect<Equals<IsNever<never>, true>>;         // the correct test

// Consequence 2: `boolean` is `true | false`, so it distributes too
type IsTrue<T> = T extends true ? 'y' : 'n';
type _23 = Expect<Equals<IsTrue<boolean>, 'y' | 'n'>>;

// Consequence 3: distribution needs a NAKED type parameter
type Wrapped<T> = { v: T } extends { v: string } ? 1 : 0;
type _24 = Expect<Equals<Wrapped<string | number>, 0>>;

/* ------------------------------------------------------------------ *
 * 7. Recursion, and why tail form matters
 * ------------------------------------------------------------------ */

type DeepAwaited<T> = T extends PromiseLike<infer U> ? DeepAwaited<U> : T;
type _25 = Expect<Equals<DeepAwaited<Promise<Promise<string>>>, string>>;

// tail-recursive: the recursive call IS the branch result, so TS optimises it
type Reverse<T extends unknown[], Acc extends unknown[] = []> =
  T extends [infer F, ...infer R] ? Reverse<R, [F, ...Acc]> : Acc;
type _26 = Expect<Equals<Reverse<[1, 2, 3]>, [3, 2, 1]>>;

// tuple length as a number — the basis of all type-level arithmetic
type BuildTuple<N extends number, Acc extends unknown[] = []> =
  Acc['length'] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>;
type Add<A extends number, B extends number> = [...BuildTuple<A>, ...BuildTuple<B>]['length'];
type _27 = Expect<Equals<Add<2, 3>, 5>>;

/* ------------------------------------------------------------------ *
 * 8. Variadic tuples: preserving a signature through a wrapper
 * ------------------------------------------------------------------ */

function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A): void => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const search = debounce((query: string, page: number) => void [query, page], 200);
type _28 = Expect<Equals<Parameters<typeof search>, [query: string, page: number]>>;
search('a', 1);
// @ts-expect-error — Expected 2 arguments, but got 1
search('a');

// partial application, fully typed
function partial<A extends unknown[], B extends unknown[], R>(
  fn: (...args: [...A, ...B]) => R,
  ...bound: A
): (...rest: B) => R {
  return (...rest) => fn(...bound, ...rest);
}
const add3 = (a: number, b: number, c: number) => a + b + c;
const add1and2 = partial(add3, 1, 2);
type _29 = Expect<Equals<ReturnType<typeof add1and2>, number>>;
// @ts-expect-error — '3' is not assignable to 'number'
add1and2('3');

/* ------------------------------------------------------------------ *
 * 9. The predicates worth memorising
 * ------------------------------------------------------------------ */

type IsAny<T> = 0 extends 1 & T ? true : false;
type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false;
type IsUnion<T, U = T> = T extends unknown ? ([U] extends [T] ? false : true) : never;

type _30 = Expect<Equals<IsAny<any>, true>>;
type _31 = Expect<Equals<IsAny<string>, false>>;
type _32 = Expect<Equals<IsUnknown<unknown>, true>>;
type _33 = Expect<Equals<IsUnion<string | number>, true>>;
type _34 = Expect<Equals<IsUnion<string>, false>>;

// And the reason Equals is needed at all: assignability cannot tell `any` apart
type _35 = Expect<Equals<Equals<any, string>, false>>;

export {};
