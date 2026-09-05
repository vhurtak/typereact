import { describe, expect, it, vi } from 'vitest';
import { promisePool, retry, singleFlight } from './async.js';

describe('promisePool', () => {
  it('respects the concurrency limit and preserves order', async () => {
    let running = 0;
    let peak = 0;
    const tasks = Array.from({ length: 10 }, (_, i) => async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return i;
    });
    await expect(promisePool(tasks, 3)).resolves.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(peak).toBeLessThanOrEqual(3);
  });
});

describe('retry', () => {
  it('retries until success', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls < 3) throw new Error('boom');
      return 'ok';
    };
    await expect(retry(fn, { retries: 5, baseMs: 0, random: () => 0 })).resolves.toBe('ok');
    expect(calls).toBe(3);
  });

  it('fails fast when shouldRetry says no', async () => {
    const fn = vi.fn(async () => {
      throw new Error('4xx');
    });
    await expect(retry(fn, { retries: 5, baseMs: 0, shouldRetry: () => false })).rejects.toThrow('4xx');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('singleFlight', () => {
  it('shares one promise per key while it is in flight', async () => {
    const inner = vi.fn(async (key: string) => key.toUpperCase());
    const wrapped = singleFlight(inner, (key) => key);
    const [a, b] = await Promise.all([wrapped('x'), wrapped('x')]);
    expect([a, b]).toEqual(['X', 'X']);
    expect(inner).toHaveBeenCalledTimes(1);
    await wrapped('x'); // released after settle
    expect(inner).toHaveBeenCalledTimes(2);
  });
});
