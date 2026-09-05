import { PRODUCTS } from './data.js';
import { sleep } from './timing.js';
import type { Product } from './types.js';

/**
 * A fake network layer with latency, cancellation and injectable failures.
 *
 * Why a mock and not `fetch`: the interesting part of the typeahead exercise is
 * the RACE — a slow request for "ip" resolving after a fast one for "iphone"
 * and overwriting the newer result. `latencyFor` deliberately makes SHORT
 * queries SLOW so the bug reproduces every time. Delete the AbortSignal
 * handling in either lab and you will see the stale write.
 */

export interface SearchOptions {
  readonly signal?: AbortSignal;
  readonly failRate?: number;
  readonly random?: () => number;
}

export class AbortError extends Error {
  override readonly name = 'AbortError';
  constructor(message = 'The operation was aborted') {
    super(message);
  }
}

const latencyFor = (query: string): number =>
  query.length <= 2 ? 900 : Math.max(120, 700 - query.length * 90);

export async function searchProducts(
  query: string,
  { signal, failRate = 0, random = Math.random }: SearchOptions = {},
): Promise<Product[]> {
  await sleep(latencyFor(query), signal);
  if (signal?.aborted) throw new AbortError();
  if (random() < failRate) throw new Error(`Upstream failed for "${query}"`);

  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return PRODUCTS.filter((product) => product.name.toLowerCase().includes(needle)).slice(0, 20);
}

export async function fetchProduct(id: string, signal?: AbortSignal): Promise<Product> {
  await sleep(200, signal);
  const found = PRODUCTS.find((product) => product.id === id);
  if (!found) throw new Error(`Product ${id} not found`);
  return found;
}

export const isAbort = (error: unknown): boolean =>
  error instanceof AbortError ||
  (error instanceof DOMException && error.name === 'AbortError') ||
  (error instanceof Error && error.name === 'AbortError');
