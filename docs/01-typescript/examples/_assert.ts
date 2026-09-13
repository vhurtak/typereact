/**
 * Type-level test harness used by the lesson files.
 *
 * `Equals<A, B>` is the strict equality test (ch. 11 of the exercises): it relies on
 * the compiler comparing two deferred conditional types by identity, which is stricter
 * than mutual assignability and is the only way to distinguish `any`.
 *
 * `Expect<T>` fails to compile unless T is exactly `true`.
 */
export type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

export type Expect<T extends true> = T;
export type ExpectNot<T extends false> = T;
