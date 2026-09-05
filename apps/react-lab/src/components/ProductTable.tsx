import {
  CATEGORIES,
  PRODUCTS,
  defaultQuery,
  formatPrice,
  runQuery,
  toggleSort,
  type Product,
  type TableQuery,
} from '@lab/core';
import { useMemo, useReducer } from 'react';

/**
 * Sortable / filterable / paginated table.
 *
 * Two senior-level points to make while writing this:
 *
 * 1. `useReducer` over five `useState`s. The state fields are coupled — changing
 *    the filter must reset the page to 1 — and a reducer makes that invariant a
 *    single line instead of a rule everyone has to remember at every call site.
 *
 * 2. `useMemo` here is real, not cargo cult. `runQuery` sorts the whole dataset;
 *    without the memo it re-sorts on every keystroke in an unrelated input.
 *    Rule of thumb: memoize O(n log n) work, not `a + b`. With the React
 *    Compiler enabled you would drop the manual memo and let it insert one.
 */
type Action =
  | { type: 'search'; value: string }
  | { type: 'category'; value: TableQuery['category'] }
  | { type: 'inStockOnly'; value: boolean }
  | { type: 'sort'; key: keyof Product }
  | { type: 'page'; value: number };

function reducer(state: TableQuery, action: Action): TableQuery {
  switch (action.type) {
    // Every filter change resets pagination — the invariant lives here, once.
    case 'search':
      return { ...state, search: action.value, page: 1 };
    case 'category':
      return { ...state, category: action.value, page: 1 };
    case 'inStockOnly':
      return { ...state, inStockOnly: action.value, page: 1 };
    case 'sort':
      return { ...state, sort: toggleSort(state.sort, action.key), page: 1 };
    case 'page':
      return { ...state, page: action.value };
  }
}

const COLUMNS: readonly { key: keyof Product; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'priceCents', label: 'Price' },
  { key: 'rating', label: 'Rating' },
  { key: 'inStock', label: 'Stock' },
];

export function ProductTable(): React.JSX.Element {
  const [query, dispatch] = useReducer(reducer, defaultQuery);
  const result = useMemo(() => runQuery(PRODUCTS, query), [query]);

  return (
    <section className="card">
      <h2>Product table — useReducer + derived state</h2>

      <div className="toolbar">
        <input
          className="input"
          aria-label="Filter by name"
          placeholder="Filter by name…"
          value={query.search}
          onChange={(event) => dispatch({ type: 'search', value: event.target.value })}
        />
        <select
          aria-label="Category"
          value={query.category}
          onChange={(event) =>
            dispatch({ type: 'category', value: event.target.value as TableQuery['category'] })
          }
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={query.inStockOnly}
            onChange={(event) => dispatch({ type: 'inStockOnly', value: event.target.checked })}
          />
          In stock only
        </label>
      </div>

      <table>
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const active = query.sort.key === column.key;
              return (
                <th
                  key={String(column.key)}
                  aria-sort={active ? (query.sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" onClick={() => dispatch({ type: 'sort', key: column.key })}>
                    {column.label}
                    {active ? (query.sort.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((product) => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td className="muted">{product.category}</td>
              <td>{formatPrice(product.priceCents)}</td>
              <td>{product.rating.toFixed(1)}</td>
              <td>{product.inStock ? 'Yes' : 'No'}</td>
            </tr>
          ))}
          {result.rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="muted">
                No products match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="toolbar">
        <button
          type="button"
          disabled={result.page <= 1}
          onClick={() => dispatch({ type: 'page', value: result.page - 1 })}
        >
          Previous
        </button>
        <span className="muted">
          Page {result.page} of {result.pageCount} · {result.total} rows
        </span>
        <button
          type="button"
          disabled={result.page >= result.pageCount}
          onClick={() => dispatch({ type: 'page', value: result.page + 1 })}
        >
          Next
        </button>
      </div>
    </section>
  );
}
