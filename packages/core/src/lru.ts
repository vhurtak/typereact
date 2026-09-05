/**
 * LRU cache in O(1) using Map insertion order.
 *
 * The trick worth saying out loud: a JS `Map` preserves insertion order, and
 * `delete` + `set` moves a key to the back. That removes the need for the
 * hand-rolled doubly-linked list the classic answer uses.
 */
export class LruCache<K, V> {
  readonly #max: number;
  readonly #map = new Map<K, V>();

  constructor(max: number) {
    if (max < 1) throw new RangeError('max must be >= 1');
    this.#max = max;
  }

  get size(): number {
    return this.#map.size;
  }

  has(key: K): boolean {
    return this.#map.has(key);
  }

  get(key: K): V | undefined {
    if (!this.#map.has(key)) return undefined;
    const value = this.#map.get(key) as V;
    this.#map.delete(key);
    this.#map.set(key, value); // refresh recency
    return value;
  }

  set(key: K, value: V): this {
    if (this.#map.has(key)) this.#map.delete(key);
    this.#map.set(key, value);
    if (this.#map.size > this.#max) {
      const oldest = this.#map.keys().next();
      if (!oldest.done) this.#map.delete(oldest.value);
    }
    return this;
  }

  delete(key: K): boolean {
    return this.#map.delete(key);
  }

  clear(): void {
    this.#map.clear();
  }

  /** Least-recently-used first. Handy in tests and for eviction assertions. */
  keys(): K[] {
    return [...this.#map.keys()];
  }
}
