import type { Store } from '@lab/core';
import { useCallback, useSyncExternalStore } from 'react';

/**
 * Bind an external store to React the correct way.
 *
 * Why not `useEffect` + `useState`? Because in concurrent rendering the store
 * can change while React is mid-render, and different components would read
 * different values — "tearing". `useSyncExternalStore` re-reads the snapshot
 * synchronously before commit, which is exactly what Redux/Zustand/Jotai use.
 *
 * The `selector` must return a stable value: returning a new object every call
 * causes an infinite loop. That constraint is the reason Redux ships
 * `useSyncExternalStoreWithSelector` (with an equality function).
 */
export function useStoreValue<S, T>(store: Store<S>, selector: (state: S) => T): T {
  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
