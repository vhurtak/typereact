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
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

/**
 * The Angular twin of `ProductTable.tsx`, built on signals.
 *
 * Direct mapping to memorise:
 *   useState        -> signal()
 *   useMemo         -> computed()      (auto-tracked; no dependency array to get wrong)
 *   useEffect       -> effect()        (but prefer computed; effects are for I/O)
 *   useReducer      -> a signal holding the state + methods that call `update`
 *
 * The real difference: `computed` is PULL-based and lazily memoised — it does
 * not recompute until something reads it, and it tracks its dependencies at
 * runtime. React's `useMemo` is a hint, recomputed whenever the dependency
 * array changes and discarded freely. That is why "why is my useMemo running
 * again?" is a React question that has no Angular equivalent.
 */
@Component({
  selector: 'app-product-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>Product table — signals + computed</h2>

      <div class="toolbar">
        <input
          class="input"
          aria-label="Filter by name"
          placeholder="Filter by name…"
          [value]="query().search"
          (input)="setSearch($any($event.target).value)"
        />
        <select aria-label="Category" [value]="query().category" (change)="setCategory($any($event.target).value)">
          <option value="all">All categories</option>
          @for (category of categories; track category) {
            <option [value]="category">{{ category }}</option>
          }
        </select>
        <label class="checkbox">
          <input type="checkbox" [checked]="query().inStockOnly" (change)="setInStockOnly($any($event.target).checked)" />
          In stock only
        </label>
      </div>

      <table>
        <thead>
          <tr>
            @for (column of columns; track column.key) {
              <th [attr.aria-sort]="ariaSort(column.key)">
                <button type="button" (click)="sortBy(column.key)">
                  {{ column.label }}{{ indicator(column.key) }}
                </button>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          <!-- track is mandatory in @for. It is the equivalent of React's key
               prop, and Angular enforces it at compile time - one of the few
               places Angular is stricter than React by default. -->
          @for (product of result().rows; track product.id) {
            <tr>
              <td>{{ product.name }}</td>
              <td class="muted">{{ product.category }}</td>
              <td>{{ price(product.priceCents) }}</td>
              <td>{{ product.rating.toFixed(1) }}</td>
              <td>{{ product.inStock ? 'Yes' : 'No' }}</td>
            </tr>
          } @empty {
            <tr><td class="muted" [attr.colspan]="columns.length">No products match this filter.</td></tr>
          }
        </tbody>
      </table>

      <div class="toolbar">
        <button type="button" [disabled]="result().page <= 1" (click)="setPage(result().page - 1)">Previous</button>
        <span class="muted">Page {{ result().page }} of {{ result().pageCount }} · {{ result().total }} rows</span>
        <button type="button" [disabled]="result().page >= result().pageCount" (click)="setPage(result().page + 1)">Next</button>
      </div>
    </section>
  `,
})
export class ProductTableComponent {
  protected readonly categories = CATEGORIES;
  protected readonly columns: readonly { key: keyof Product; label: string }[] = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'priceCents', label: 'Price' },
    { key: 'rating', label: 'Rating' },
    { key: 'inStock', label: 'Stock' },
  ];

  protected readonly query = signal<TableQuery>(defaultQuery);

  /** Recomputed only when `query` actually changes, and only when read. */
  protected readonly result = computed(() => runQuery(PRODUCTS, this.query()));

  // Every filter mutation resets the page — same invariant as the React reducer.
  protected setSearch(search: string): void {
    this.query.update((q) => ({ ...q, search, page: 1 }));
  }
  protected setCategory(category: TableQuery['category']): void {
    this.query.update((q) => ({ ...q, category, page: 1 }));
  }
  protected setInStockOnly(inStockOnly: boolean): void {
    this.query.update((q) => ({ ...q, inStockOnly, page: 1 }));
  }
  protected sortBy(key: keyof Product): void {
    this.query.update((q) => ({ ...q, sort: toggleSort(q.sort, key), page: 1 }));
  }
  protected setPage(page: number): void {
    this.query.update((q) => ({ ...q, page }));
  }

  protected ariaSort(key: keyof Product): 'ascending' | 'descending' | 'none' {
    const sort = this.query().sort;
    if (sort.key !== key) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }
  protected indicator(key: keyof Product): string {
    const sort = this.query().sort;
    if (sort.key !== key) return '';
    return sort.direction === 'asc' ? ' ▲' : ' ▼';
  }
  protected price(cents: number): string {
    return formatPrice(cents);
  }
}
