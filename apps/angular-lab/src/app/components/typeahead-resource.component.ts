import { formatPrice, searchProducts } from '@lab/core';
import { ChangeDetectionStrategy, Component, resource, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

/**
 * The same typeahead again, with zero RxJS in the component body — the modern
 * signals answer, and the one that shows you are current with Angular 19/20.
 *
 * `resource()` gives you, for free, what the React hook had to hand-roll:
 *   - `params` is a reactive dependency; changing it re-runs the loader
 *   - the loader receives an `abortSignal` that fires when params change or
 *     the component is destroyed  -> no stale writes
 *   - `status` / `value` / `error` are signals, so no manual RemoteData union
 *
 * The one thing signals still have no primitive for is TIME. Debouncing is a
 * time operator, so we round-trip through RxJS: signal -> toObservable ->
 * debounceTime -> toSignal. Being able to say *why* that round-trip exists is
 * the point of this component.
 *
 * `resource` is still marked experimental — say so in an interview; it signals
 * you read release notes rather than blog posts.
 */
@Component({
  selector: 'app-typeahead-resource',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card" style="margin-top:16px">
      <h2>Same thing with resource() — no RxJS in the component</h2>

      <input
        class="input"
        type="search"
        aria-label="Search products with resource"
        placeholder="Search products…"
        [value]="raw()"
        (input)="raw.set($any($event.target).value)"
      />

      <div class="status" aria-live="polite">
        @switch (products.status()) {
          @case ('loading') { Searching… }
          @case ('reloading') { Refreshing… }
          @case ('error') { Failed: {{ products.error() }} }
          @default { {{ products.value().length }} result(s) }
        }
      </div>

      <ul class="results">
        @for (product of products.value(); track product.id) {
          <li>
            <span>{{ product.name }}</span>
            <span class="muted">{{ format(product.priceCents) }}</span>
          </li>
        }
      </ul>
    </section>
  `,
})
export class TypeaheadResourceComponent {
  protected readonly raw = signal('');

  /** Signals have no time operators; borrow one from RxJS and come straight back. */
  private readonly debounced = toSignal(toObservable(this.raw).pipe(debounceTime(300)), {
    initialValue: '',
  });

  protected readonly products = resource({
    params: () => this.debounced().trim(),
    loader: ({ params, abortSignal }) =>
      params ? searchProducts(params, { signal: abortSignal }) : Promise.resolve([]),
    defaultValue: [],
  });

  protected format(cents: number): string {
    return formatPrice(cents);
  }
}
