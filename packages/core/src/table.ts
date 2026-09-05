import type { Product } from './types.js';

/**
 * Pure table logic: filter -> sort -> paginate.
 *
 * Keeping this out of the components is what lets the React and Angular labs be
 * a genuine apples-to-apples comparison — the only difference left between them
 * is the rendering/reactivity model, which is exactly what you want to discuss.
 */

export type SortDirection = 'asc' | 'desc';

export interface SortState<T> {
  readonly key: keyof T;
  readonly direction: SortDirection;
}

export interface TableQuery {
  readonly search: string;
  readonly category: Product['category'] | 'all';
  readonly inStockOnly: boolean;
  readonly sort: SortState<Product>;
  readonly page: number;
  readonly pageSize: number;
}

export const defaultQuery: TableQuery = {
  search: '',
  category: 'all',
  inStockOnly: false,
  sort: { key: 'name', direction: 'asc' },
  page: 1,
  pageSize: 10,
};

export interface TableResult<T> {
  readonly rows: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageCount: number;
}

export function filterProducts(products: readonly Product[], query: TableQuery): Product[] {
  const needle = query.search.trim().toLowerCase();
  return products.filter((product) => {
    if (query.inStockOnly && !product.inStock) return false;
    if (query.category !== 'all' && product.category !== query.category) return false;
    if (needle && !product.name.toLowerCase().includes(needle)) return false;
    return true;
  });
}

/** Stable, locale-aware, type-aware comparator. Never mutates the input. */
export function sortRows<T>(rows: readonly T[], sort: SortState<T>): T[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = a[sort.key];
    const right = b[sort.key];
    if (typeof left === 'string' && typeof right === 'string') {
      return sign * left.localeCompare(right);
    }
    if (typeof left === 'boolean' && typeof right === 'boolean') {
      return sign * (Number(left) - Number(right));
    }
    return sign * (Number(left) - Number(right));
  });
}

export function paginate<T>(rows: readonly T[], page: number, pageSize: number): TableResult<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    total: rows.length,
    page: safePage,
    pageCount,
  };
}

export function runQuery(products: readonly Product[], query: TableQuery): TableResult<Product> {
  return paginate(sortRows(filterProducts(products, query), query.sort), query.page, query.pageSize);
}

/** Click a header: same column toggles direction, new column resets to asc. */
export function toggleSort<T>(current: SortState<T>, key: keyof T): SortState<T> {
  if (current.key !== key) return { key, direction: 'asc' };
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

export const formatPrice = (cents: number, locale = 'en-US', currency = 'USD'): string =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
