import { Emitter } from './emitter.js';

/**
 * A ~40-line observable store.
 *
 * This is the shared state layer for BOTH labs:
 *   - React consumes it through `useSyncExternalStore` (tearing-free in
 *     concurrent rendering — that is the whole reason the hook exists).
 *   - Angular wraps `subscribe` in a signal / `toSignal`.
 *
 * Being able to write this and then explain how each framework binds to it is
 * a strong senior-level answer to "how does state management actually work?".
 */
export interface Store<S> {
  getState(): S;
  setState(updater: S | ((previous: S) => S)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<S>(initial: S): Store<S> {
  let state = initial;
  const emitter = new Emitter<{ change: void }>();

  return {
    getState: () => state,
    setState(updater) {
      const next =
        typeof updater === 'function' ? (updater as (previous: S) => S)(state) : updater;
      if (Object.is(next, state)) return; // bail out: no notification, no re-render
      state = next;
      emitter.emit('change', undefined);
    },
    subscribe(listener) {
      return emitter.on('change', listener);
    },
  };
}

/** Redux-style reducer store, for when the interviewer asks for one. */
export function createReducerStore<S, A>(
  reducer: (state: S, action: A) => S,
  initial: S,
): Store<S> & { dispatch(action: A): void } {
  const store = createStore(initial);
  return {
    ...store,
    dispatch(action) {
      store.setState((previous) => reducer(previous, action));
    },
  };
}

/** Undo/redo wrapper — a very common live-coding follow-up. */
export interface HistoryState<S> {
  readonly past: readonly S[];
  readonly present: S;
  readonly future: readonly S[];
}

export function createHistoryStore<S>(initial: S, limit = 50) {
  const store = createStore<HistoryState<S>>({ past: [], present: initial, future: [] });
  return {
    ...store,
    commit(next: S): void {
      store.setState((h) =>
        Object.is(next, h.present)
          ? h
          : { past: [...h.past, h.present].slice(-limit), present: next, future: [] },
      );
    },
    undo(): void {
      store.setState((h) => {
        const previous = h.past.at(-1);
        if (previous === undefined) return h;
        return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] };
      });
    },
    redo(): void {
      store.setState((h) => {
        const [next, ...rest] = h.future;
        if (next === undefined) return h;
        return { past: [...h.past, h.present], present: next, future: rest };
      });
    },
    canUndo: (): boolean => store.getState().past.length > 0,
    canRedo: (): boolean => store.getState().future.length > 0,
  };
}
