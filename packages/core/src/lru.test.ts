import { describe, expect, it } from 'vitest';
import { LruCache } from './lru.js';

describe('LruCache', () => {
  it('evicts the least recently used entry', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1).set('b', 2);
    expect(cache.get('a')).toBe(1); // 'a' becomes most recent
    cache.set('c', 3);
    expect(cache.has('b')).toBe(false);
    expect(cache.keys()).toEqual(['a', 'c']);
  });

  it('overwriting a key refreshes its recency', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1).set('b', 2).set('a', 9).set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(9);
  });

  it('rejects a max below 1', () => {
    expect(() => new LruCache(0)).toThrow(RangeError);
  });
});
