import { createHistoryStore } from '@lab/core';
import { useCallback } from 'react';
import { useStoreValue } from '../hooks/useStore.js';

/**
 * External store + undo/redo, bound with `useSyncExternalStore`.
 *
 * The same `createHistoryStore` instance is consumed by the Angular lab through
 * a signal. That is the point of the exercise: state management is not a
 * framework feature, it is a subscription protocol the framework adapts to.
 */
const history = createHistoryStore(0);

export function StoreCounter(): React.JSX.Element {
  // Selectors must be stable, otherwise getSnapshot changes identity every
  // render and useSyncExternalStore re-subscribes in a loop.
  const value = useStoreValue(history, useCallback((state) => state.present, []));
  const canUndo = useStoreValue(history, useCallback((state) => state.past.length > 0, []));
  const canRedo = useStoreValue(history, useCallback((state) => state.future.length > 0, []));

  return (
    <section className="card">
      <h2>External store — useSyncExternalStore + undo/redo</h2>
      <p className="value">{value}</p>
      <div className="toolbar">
        <button type="button" onClick={() => history.commit(value + 1)}>
          Increment
        </button>
        <button type="button" onClick={() => history.commit(value - 1)}>
          Decrement
        </button>
        <button type="button" disabled={!canUndo} onClick={() => history.undo()}>
          Undo
        </button>
        <button type="button" disabled={!canRedo} onClick={() => history.redo()}>
          Redo
        </button>
      </div>
    </section>
  );
}
