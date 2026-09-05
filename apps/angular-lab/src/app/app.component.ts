import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ProductTableComponent } from './components/product-table.component';
import { StoreCounterComponent } from './components/store-counter.component';
import { TypeaheadComponent } from './components/typeahead.component';
import { VirtualListComponent } from './components/virtual-list.component';

type TabKey = 'typeahead' | 'table' | 'virtual' | 'store';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TypeaheadComponent, ProductTableComponent, VirtualListComponent, StoreCounterComponent],
  template: `
    <main>
      <header>
        <h1>Angular Lab</h1>
        <p class="muted">
          Every demo here has a React twin in <code>apps/react-lab</code>.
        </p>
      </header>

      <nav class="tabs" role="tablist">
        @for (item of tabs; track item.key) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === item.key"
            [class]="tab() === item.key ? 'tab active' : 'tab'"
            (click)="tab.set(item.key)"
          >
            {{ item.label }}
          </button>
        }
      </nav>

      <!-- @switch/@if/@for: the built-in control flow that replaced *ngIf and
           *ngFor in v17. It is compiled, not a directive, so it needs no import
           and produces smaller, faster output. -->
      @switch (tab()) {
        @case ('typeahead') { <app-typeahead /> }
        @case ('table') { <app-product-table /> }
        @case ('virtual') { <app-virtual-list /> }
        @case ('store') { <app-store-counter /> }
      }
    </main>
  `,
})
export class AppComponent {
  protected readonly tab = signal<TabKey>('typeahead');
  protected readonly tabs: readonly { key: TabKey; label: string }[] = [
    { key: 'typeahead', label: 'Typeahead' },
    { key: 'table', label: 'Table' },
    { key: 'virtual', label: 'Virtual list' },
    { key: 'store', label: 'Store' },
  ];
}
