import { sleep } from './timing.js';

/**
 * Async control-flow utilities. `promisePool` and `retry` are the two most
 * common "write this on the whiteboard" tasks for senior Node/frontend roles.
 */

/** Run tasks with bounded concurrency, preserving input order in the output. */
export async function promisePool<T>(
  tasks: readonly (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  if (concurrency < 1) throw new RangeError('concurrency must be >= 1');
  const results = new Array<T>(tasks.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = next++;
      const task = tasks[index];
      if (!task) return;
      results[index] = await task();
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

export interface RetryOptions {
  readonly retries?: number;
  readonly baseMs?: number;
  readonly maxMs?: number;
  /** Return false to fail fast (e.g. HTTP 4xx should not be retried). */
  readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
  readonly signal?: AbortSignal;
  /** Injectable for deterministic tests. */
  readonly random?: () => number;
}

/** Exponential backoff with full jitter — the AWS-recommended shape. */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 3,
    baseMs = 100,
    maxMs = 5_000,
    shouldRetry = () => true,
    signal,
    random = Math.random,
  } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error, attempt)) break;
      const ceiling = Math.min(maxMs, baseMs * 2 ** attempt);
      await sleep(Math.floor(random() * ceiling), signal);
    }
  }
  throw lastError;
}

/**
 * Deduplicate concurrent calls with the same key ("single flight").
 * The pattern behind React Query / Angular `shareReplay` request dedup.
 */
export function singleFlight<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
  keyOf: (...args: A) => string,
): (...args: A) => Promise<T> {
  const inFlight = new Map<string, Promise<T>>();
  return (...args: A): Promise<T> => {
    const key = keyOf(...args);
    const existing = inFlight.get(key);
    if (existing) return existing;
    const promise = fn(...args).finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  };
}
