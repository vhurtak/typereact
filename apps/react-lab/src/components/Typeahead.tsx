import { assertNever, formatPrice } from '@lab/core';
import { useId, useState } from 'react';
import { useAbortableSearch } from '../hooks/useAbortableSearch.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';

/**
 * Debounced, cancellable typeahead.
 *
 * Compare with `apps/angular-lab/src/app/components/typeahead.component.ts`,
 * which solves the same three problems with `debounceTime + switchMap`.
 * The RxJS version is shorter; the React version is more explicit about where
 * the cancellation lives. Be ready to argue either side.
 *
 * Accessibility is part of a senior answer: combobox role, aria-expanded,
 * aria-controls and aria-live so a screen reader hears the result count.
 */
export function Typeahead(): React.JSX.Element {
  const [input, setInput] = useState('');
  const query = useDebouncedValue(input, 300);
  const state = useAbortableSearch(query);
  const listId = useId();

  return (
    <section className="card">
      <h2>Typeahead — debounce + AbortController</h2>
      <p className="hint">
        Type fast. Short queries are deliberately slower in the mock API, so a stale response
        would win the race if the effect did not abort.
      </p>

      <input
        className="input"
        type="search"
        role="combobox"
        aria-expanded={state.status === 'success'}
        aria-controls={listId}
        aria-label="Search products"
        placeholder="Search products…"
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />

      <div aria-live="polite" className="status">
        {renderStatus(state)}
      </div>

      <ul id={listId} className="results">
        {state.status === 'success' &&
          state.data.map((product) => (
            <li key={product.id}>
              <span>{product.name}</span>
              <span className="muted">{formatPrice(product.priceCents)}</span>
            </li>
          ))}
      </ul>
    </section>
  );
}

function renderStatus(state: ReturnType<typeof useAbortableSearch>): string {
  switch (state.status) {
    case 'idle':
      return 'Start typing to search.';
    case 'loading':
      return 'Searching…';
    case 'success':
      return `${state.data.length} result${state.data.length === 1 ? '' : 's'}`;
    case 'error':
      return `Something went wrong: ${state.error.message}`;
    default:
      return assertNever(state);
  }
}
