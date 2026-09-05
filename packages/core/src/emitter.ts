/**
 * Typed event emitter. Demonstrates mapped types + variadic tuples, which is
 * the TS half of the question; the JS half is just a Map of Sets.
 */
export type EventMap = Record<string, unknown>;
export type Unsubscribe = () => void;

export class Emitter<E extends EventMap> {
  readonly #listeners = new Map<keyof E, Set<(payload: never) => void>>();

  on<K extends keyof E>(event: K, listener: (payload: E[K]) => void): Unsubscribe {
    let set = this.#listeners.get(event);
    if (!set) {
      set = new Set();
      this.#listeners.set(event, set);
    }
    set.add(listener as (payload: never) => void);
    return () => {
      set?.delete(listener as (payload: never) => void);
      if (set?.size === 0) this.#listeners.delete(event);
    };
  }

  once<K extends keyof E>(event: K, listener: (payload: E[K]) => void): Unsubscribe {
    const off = this.on(event, (payload) => {
      off();
      listener(payload);
    });
    return off;
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    // Copy before iterating: a listener may unsubscribe during dispatch.
    const set = this.#listeners.get(event);
    if (!set) return;
    for (const listener of [...set]) (listener as (p: E[K]) => void)(payload);
  }

  listenerCount(event: keyof E): number {
    return this.#listeners.get(event)?.size ?? 0;
  }
}
