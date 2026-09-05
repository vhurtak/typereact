import { describe, expect, it, vi } from 'vitest';
import { createHistoryStore, createStore } from './store.js';

describe('createStore', () => {
  it('bails out when the next state is identical', () => {
    const store = createStore({ n: 1 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState((s) => s); // same reference
    expect(listener).not.toHaveBeenCalled();
    store.setState({ n: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes cleanly', () => {
    const store = createStore(0);
    const listener = vi.fn();
    store.subscribe(listener)();
    store.setState(1);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('createHistoryStore', () => {
  it('undoes and redoes', () => {
    const history = createHistoryStore('a');
    history.commit('b');
    history.commit('c');
    history.undo();
    expect(history.getState().present).toBe('b');
    history.redo();
    expect(history.getState().present).toBe('c');
    expect(history.canRedo()).toBe(false);
  });

  it('a new commit clears the redo stack', () => {
    const history = createHistoryStore(0);
    history.commit(1);
    history.undo();
    history.commit(42);
    expect(history.canRedo()).toBe(false);
    expect(history.getState().present).toBe(42);
  });
});
