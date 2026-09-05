/**
 * Domain types shared by every app in the monorepo.
 *
 * Interview talking point: keep the domain model framework-agnostic. Nothing in
 * this package imports React, Angular or Node — which is exactly why the same
 * logic can be unit-tested in milliseconds and reused in four runtimes.
 */

export type ProductId = string & { readonly __brand: 'ProductId' };

/** Branded-type constructor. Prevents `getProduct(userId)` compiling by accident. */
export const productId = (raw: string): ProductId => raw as ProductId;

export interface Product {
  readonly id: ProductId;
  readonly name: string;
  readonly category: Category;
  /** Minor units (cents). Never store money as a float. */
  readonly priceCents: number;
  readonly rating: number;
  readonly inStock: boolean;
}

export const CATEGORIES = ['laptops', 'phones', 'audio', 'wearables'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Discriminated union: the single most-asked TS modelling question. */
export type RemoteData<T, E = Error> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: E };

export const remote = {
  idle: <T, E = Error>(): RemoteData<T, E> => ({ status: 'idle' }),
  loading: <T, E = Error>(): RemoteData<T, E> => ({ status: 'loading' }),
  success: <T, E = Error>(data: T): RemoteData<T, E> => ({ status: 'success', data }),
  error: <T, E = Error>(error: E): RemoteData<T, E> => ({ status: 'error', error }),
} as const;

/**
 * Exhaustiveness helper. Put it in the `default:` branch of a switch over a
 * union and the compiler fails the build when someone adds a variant.
 */
export function assertNever(value: never, message = 'Unexpected variant'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}
