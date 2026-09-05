import { PRODUCTS, formatPrice, type Product } from '@lab/core';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

/**
 * The Angular twin of `VirtualList.tsx`. Identical maths, different reactivity.
 *
 * In production you would reach for `@angular/cdk/scrolling`
 * (`<cdk-virtual-scroll-viewport>`), which is the answer the interviewer wants
 * to hear — but being able to write the 30-line version is what proves you know
 * what the CDK is doing.
 */
const ROW_HEIGHT = 32;
const OVERSCAN = 6;
const VIEWPORT_HEIGHT = 320;

@Component({
  selector: 'app-virtual-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>Virtual list — 50,000 rows, ~20 DOM nodes</h2>
      <div class="viewport" (scroll)="onScroll($event)">
        <div [style.height.px]="items.length * rowHeight" style="position:relative">
          <ul
            [style.transform]="'translateY(' + first() * rowHeight + 'px)'"
            style="position:absolute; inset:0; margin:0; padding:0; list-style:none"
          >
            @for (product of slice(); track $index) {
              <li [style.height.px]="rowHeight">
                <span class="muted">#{{ first() + $index }}</span> {{ product.name }}
                <span class="muted"> · {{ price(product.priceCents) }}</span>
              </li>
            }
          </ul>
        </div>
      </div>
      <p class="hint">Rendered rows: {{ slice().length }} of {{ items.length }}</p>
    </section>
  `,
})
export class VirtualListComponent {
  protected readonly rowHeight = ROW_HEIGHT;
  protected readonly items: readonly Product[] = Array.from(
    { length: 50_000 },
    (_, index) => PRODUCTS[index % PRODUCTS.length] as Product,
  );

  private readonly scrollTop = signal(0);

  protected readonly first = computed(() =>
    Math.max(0, Math.floor(this.scrollTop() / ROW_HEIGHT) - OVERSCAN),
  );

  protected readonly slice = computed(() => {
    const count = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
    return this.items.slice(this.first(), this.first() + count);
  });

  /**
   * Zoneless note: this handler is a template listener, so Angular schedules
   * change detection for this component after it runs. Had we attached the
   * listener manually with `addEventListener` outside the template, nothing
   * would repaint until we called `ChangeDetectorRef.markForCheck()` — that is
   * exactly the class of bug zoneless surfaces.
   */
  protected onScroll(event: Event): void {
    this.scrollTop.set((event.target as HTMLElement).scrollTop);
  }

  protected price(cents: number): string {
    return formatPrice(cents);
  }
}
