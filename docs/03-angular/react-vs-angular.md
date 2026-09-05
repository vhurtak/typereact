# React ⇄ Angular, for people who know one of them

Open `apps/react-lab` and `apps/angular-lab` side by side. Same four demos, twice.

## 1. The translation table

| Concept | React 19 | Angular 20 |
|---|---|---|
| Component | function returning JSX | class + decorator, `standalone` by default since v19 |
| Local state | `useState` | `signal()` |
| Derived value | `useMemo(fn, deps)` | `computed(fn)` — deps tracked automatically |
| Side effect | `useEffect(fn, deps)` | `effect(fn)`, or better: don't — use `computed`/`resource` |
| Reducer | `useReducer` | a `signal` + methods calling `.update()` |
| External store | `useSyncExternalStore` | `subscribe` → `signal`, or `toSignal` |
| Async data | `useEffect` + AbortController, or TanStack Query | `resource()` / `rxResource()`, or `debounceTime`+`switchMap` |
| Props | function arguments | `input()` signal inputs (`@Input` is legacy) |
| Events up | callback props | `output()` (`@Output` + EventEmitter is legacy) |
| Two-way | value + onChange | `model()` signal, or `[(ngModel)]` |
| List identity | `key` prop | `track` in `@for` — **compulsory**, enforced at compile time |
| Conditional | `{cond && …}` / ternary | `@if` / `@else` |
| Context / DI | `createContext` + `useContext` | hierarchical injector + `inject()` |
| Portal | `createPortal` | CDK `Portal` / `ViewContainerRef` |
| Lazy | `React.lazy` + Suspense | `@defer` block, or `loadComponent` route |
| Error boundary | class component | `ErrorHandler` provider (no per-subtree boundary) |
| Cleanup | effect return function | `DestroyRef.onDestroy()` / `takeUntilDestroyed()` |
| Styling scope | none (CSS modules etc.) | built-in view encapsulation |

## 2. The reactivity difference, said properly

**React re-renders a component and diffs the output.** State change → schedule → call the
function again → reconcile the tree. Granularity is the component. `memo` narrows it.

**Angular signals are a dependency graph.** A `computed` knows exactly which signals it
read, and marks itself dirty only when one of them changes. Granularity is the
*expression*. Nothing re-runs unless something downstream reads it.

The practical consequence, and a great answer to "which do you prefer?":

> React's model is simpler to reason about — one function, top to bottom — but it makes
> you manage identity manually (`key`, `memo`, dependency arrays). Angular's signal graph
> handles identity for you and does less work, but you're maintaining a graph, so it's
> easier to write something that silently never updates. React is moving toward Angular's
> answer with the compiler; Angular moved toward React's DX with standalone components
> and `inject()`. They're converging.

## 3. Zone.js and zoneless — the current Angular headline

`apps/angular-lab` has **no zone.js dependency at all**. `main.ts` uses
`provideZonelessChangeDetection()`.

Historically Zone.js monkey-patched every async browser API and ran change detection over
the whole tree after each one. That's why Angular felt "magic" and why it was slow by
default. Zoneless drops the patching: a view is checked when

- a signal it read changed,
- an input changed,
- a template event handler fired,
- `ChangeDetectorRef.markForCheck()` was called, or
- an async pipe emitted.

Bugs it surfaces: listeners attached outside the template (`addEventListener` in
`ngAfterViewInit`), third-party callbacks, and any `mutate`-style state update. The fix is
always the same — make the state a signal, or call `markForCheck`.

`OnPush` is the halfway house and should be on every component regardless; zoneless is
essentially "OnPush everywhere, enforced".

## 4. RxJS — when it's still the right answer

Signals have no concept of **time**. Anything involving time or event streams still wants
RxJS. `typeahead-resource.component.ts` shows the round trip:

```ts
toSignal(toObservable(this.raw).pipe(debounceTime(300)), { initialValue: '' })
```

The flattening operators, which you will be asked to compare:

| Operator | Behaviour | Use for |
|---|---|---|
| `switchMap` | cancels the previous inner stream | typeahead, route params — **the default** |
| `mergeMap` | runs all in parallel, order not guaranteed | independent parallel work |
| `concatMap` | queues, preserves order | ordered writes, sequential saves |
| `exhaustMap` | ignores new while one is in flight | login button, double-submit guard |

Other high-value operators: `shareReplay({ bufferSize: 1, refCount: true })` (dedup a
request; the `refCount` part matters — without it you leak the subscription),
`combineLatest`, `withLatestFrom`, `startWith`, `catchError`, `retry({ delay })`,
`takeUntilDestroyed`.

**Hot vs cold**: a cold observable does its work per subscriber (an HTTP call runs twice
if you subscribe twice); a Subject is hot. `shareReplay` converts one to the other.

## 5. Angular DI, versus React context

Angular's injector is hierarchical: root → route → component (element) injector. Resolution
walks up. That gives you things React context can't do as cleanly:

- `providedIn: 'root'` — tree-shakeable singleton.
- Providing a service at a *route* so its lifetime matches the feature.
- `InjectionToken` for non-class values, `useFactory`, `useExisting`, `multi: true`.
- `@Self`, `@SkipSelf`, `@Optional`, `@Host` to control the walk.
- `inject()` in a field initialiser — the modern form, and the reason constructor
  injection is fading.

If you know NestJS, the decorator syntax is identical, but Nest's DI is module-scoped:
a provider must be `exports`ed to escape its module. Angular's `providedIn: 'root'` has
no equivalent gate.

## 6. Forms

- **Reactive forms** — `FormGroup`/`FormControl`/`FormArray`, typed since v14. This is the
  senior answer; validation is explicit, testable, and composable.
- **Template-driven** — `ngModel`. Fine for a two-field form; hard to test.
- **Custom validators** are `(control) => ValidationErrors | null`; async ones return an
  Observable. Cross-field validation goes on the group, not the control.
- **`ControlValueAccessor`** — how you make a custom component work inside a form. Being
  able to describe its four methods (`writeValue`, `registerOnChange`, `registerOnTouched`,
  `setDisabledState`) is a standard senior Angular question.

## 7. Angular questions with short answers

- *Standalone vs NgModule?* Standalone is the default since v19; components declare their
  own `imports`. NgModules still exist for libraries and legacy. `bootstrapApplication`
  replaces `platformBrowserDynamic().bootstrapModule`.
- *`ngOnChanges` vs signal inputs?* Signal inputs make the change detectable in the graph;
  you rarely need `ngOnChanges` any more, and `computed` off an input is the idiom.
- *What does `async` pipe do for you?* Subscribes, unsubscribes on destroy, and marks for
  check. Forgetting it is the classic Angular memory leak.
- *Content projection?* `<ng-content>`, with `select=` for multi-slot — Angular's
  `children` prop. `ng-template`/`ngTemplateOutlet` is the render-prop equivalent.
- *How do you lazy-load?* Route-level `loadComponent`/`loadChildren`, or `@defer` blocks
  with triggers (`on viewport`, `on interaction`, `on idle`) for in-page deferral. `@defer`
  has no React equivalent and is worth mentioning.
- *Change detection strategies?* `Default` (check everything on every tick) vs `OnPush`
  (check only on input identity change, events, async pipe, `markForCheck`). Zoneless
  makes `OnPush` semantics the baseline.
- *SSR?* `@angular/ssr` with hydration, and **incremental hydration** (v19+) which
  hydrates `@defer` blocks on interaction. Comparable to React's RSC/streaming story but
  architecturally different: Angular hydrates a whole app, Next splits server and client
  components at the module level.
