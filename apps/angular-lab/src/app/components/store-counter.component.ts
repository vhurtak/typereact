import { createHistoryStore } from '@lab/core';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';

/**
 * The framework-agnostic store from `@lab/core`, bound to Angular.
 *
 * React binds the very same object with `useSyncExternalStore`
 * (see `apps/react-lab/src/components/StoreCounter.tsx`). Here we subscribe
 * once and push into a signal. Both are 5 lines. The point to make in an
 * interview: NgRx / Redux / Zustand are not magic — they are an object with
 * `getState`, `setState` and `subscribe`, plus a framework adapter.
 */
const history = createHistoryStore(0);

@Component({
  selector: 'app-store-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>External store — subscribe → signal, with undo/redo</h2>
      <p class="value">{{ value() }}</p>
      <div class="toolbar">
        <button type="button" (click)="commit(value() + 1)">Increment</button>
        <button type="button" (click)="commit(value() - 1)">Decrement</button>
        <button type="button" [disabled]="!canUndo()" (click)="undo()">Undo</button>
        <button type="button" [disabled]="!canRedo()" (click)="redo()">Redo</button>
      </div>
    </section>
  `,
})
export class StoreCounterComponent {
  private readonly snapshot = signal(history.getState());

  protected readonly value = computed(() => this.snapshot().present);
  protected readonly canUndo = computed(() => this.snapshot().past.length > 0);
  protected readonly canRedo = computed(() => this.snapshot().future.length > 0);

  constructor() {
    // `DestroyRef.onDestroy` is the standalone-era replacement for implementing
    // OnDestroy — it works in any injection context, including functions.
    const unsubscribe = history.subscribe(() => this.snapshot.set(history.getState()));
    inject(DestroyRef).onDestroy(unsubscribe);
  }

  protected commit(next: number): void {
    history.commit(next);
  }
  protected undo(): void {
    history.undo();
  }
  protected redo(): void {
    history.redo();
  }
}
