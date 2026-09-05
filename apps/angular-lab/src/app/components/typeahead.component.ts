import { formatPrice, searchProducts, type Product } from '@lab/core';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Observable, Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { TypeaheadResourceComponent } from './typeahead-resource.component';

interface ViewState {
  readonly loading: boolean;
  readonly results: readonly Product[];
  readonly error: string | null;
}

/**
 * The Angular twin of `apps/react-lab/src/components/Typeahead.tsx`, done the
 * classic RxJS way.
 *
 * The whole race-condition problem collapses into one operator:
 *   debounceTime(300)     -> the React `useDebouncedValue` hook
 *   distinctUntilChanged  -> skip redundant identical queries
 *   switchMap             -> UNSUBSCRIBES from the previous inner observable,
 *                            which is both the AbortController and the
 *                            "ignore the stale response" check in React
 *   takeUntilDestroyed    -> the effect cleanup on unmount
 *
 * Interview framing: React makes you write the cancellation; RxJS makes you
 * *choose an operator* — and the classic follow-up is "switchMap vs mergeMap vs
 * concatMap vs exhaustMap". Answer: switchMap for typeahead (cancel the old),
 * concatMap for ordered writes, mergeMap for independent parallel work,
 * exhaustMap for a login button you must not double-submit.
 */
@Component({
  selector: 'app-typeahead',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TypeaheadResourceComponent],
  template: `
    <section class="card">
      <h2>Typeahead — debounceTime + switchMap</h2>
      <p class="hint">
        Short queries are deliberately slower in the mock API, so without
        <code>switchMap</code> a stale response would overwrite a newer one.
      </p>

      <input
        class="input"
        type="search"
        role="combobox"
        [attr.aria-expanded]="state().results.length > 0"
        aria-label="Search products"
        placeholder="Search products…"
        [value]="query()"
        (input)="onInput($event)"
      />

      <div class="status" aria-live="polite">
        @if (state().loading) {
          Searching…
        } @else if (state().error) {
          Something went wrong: {{ state().error }}
        } @else {
          {{ state().results.length }} result(s)
        }
      </div>

      <ul class="results">
        @for (product of state().results; track product.id) {
          <li>
            <span>{{ product.name }}</span>
            <span class="muted">{{ price(product) }}</span>
          </li>
        }
      </ul>
    </section>

    <app-typeahead-resource />
  `,
})
export class TypeaheadComponent {
  protected readonly query = signal('');
  private readonly input$ = new Subject<string>();

  /**
   * `toSignal` is the bridge from RxJS to the signal graph. With
   * `initialValue` the signal is never undefined, and `takeUntilDestroyed`
   * ties the subscription to the component's lifecycle — no manual
   * `ngOnDestroy` + `Subscription.unsubscribe` bookkeeping.
   */
  protected readonly state = toSignal(
    this.input$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => {
        if (!query.trim()) return of<ViewState>({ loading: false, results: [], error: null });
        return fromSearch(query);
      }),
      takeUntilDestroyed(),
    ),
    { initialValue: { loading: false, results: [], error: null } satisfies ViewState },
  );

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.input$.next(value);
  }

  protected price(product: Product): string {
    return formatPrice(product.priceCents);
  }
}

function fromSearch(query: string): Observable<ViewState> {
  // `from(promise)` cannot be cancelled, so we bridge the AbortSignal manually:
  // switchMap's unsubscribe triggers the teardown, which aborts the fetch.
  return new Observable<ViewState>((subscriber) => {
    const controller = new AbortController();
    subscriber.next({ loading: true, results: [], error: null });
    searchProducts(query, { signal: controller.signal })
      .then((results) => {
        subscriber.next({ loading: false, results, error: null });
        subscriber.complete();
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        subscriber.next({
          loading: false,
          results: [],
          error: error instanceof Error ? error.message : String(error),
        });
        subscriber.complete();
      });
    return () => controller.abort();
  });
}
