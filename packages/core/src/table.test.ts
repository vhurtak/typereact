import { describe, expect, it } from 'vitest';
import { PRODUCTS } from './data.js';
import { defaultQuery, paginate, runQuery, sortRows, toggleSort } from './table.js';

describe('table pipeline', () => {
  it('sorts without mutating the input', () => {
    const input = [...PRODUCTS].slice(0, 5);
    const copy = [...input];
    sortRows(input, { key: 'priceCents', direction: 'desc' });
    expect(input).toEqual(copy);
  });

  it('clamps an out-of-range page', () => {
    const result = paginate(PRODUCTS, 999, 10);
    expect(result.page).toBe(result.pageCount);
    expect(result.rows).not.toHaveLength(0);
  });

  it('filters, sorts and paginates together', () => {
    const result = runQuery(PRODUCTS, {
      ...defaultQuery,
      category: 'audio',
      inStockOnly: true,
      sort: { key: 'priceCents', direction: 'asc' },
    });
    expect(result.rows.every((p) => p.category === 'audio' && p.inStock)).toBe(true);
    const prices = result.rows.map((p) => p.priceCents);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('toggles direction on the same column, resets on a new one', () => {
    const first = toggleSort({ key: 'name', direction: 'asc' } as const, 'name');
    expect(first.direction).toBe('desc');
    expect(toggleSort(first, 'rating')).toEqual({ key: 'rating', direction: 'asc' });
  });
});
