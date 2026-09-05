# React for senior interviews

Everything here maps to code in `apps/react-lab`. Read the file, then the section.

## 1. Rendering, in the words interviewers want

React is a **UI = f(state)** engine with three phases:

1. **Render** — call your components, build a new element tree. Must be pure. Called
   multiple times, thrown away, restarted. This is why StrictMode double-invokes.
2. **Reconcile** — diff against the current fiber tree. Same type + same key → update in
   place; different type or key → unmount and remount (state is lost).
3. **Commit** — apply DOM mutations synchronously, then run layout effects, paint, then
   passive effects.

**Keys.** A key is an identity claim, not a uniqueness requirement. Using array index as
the key is fine for a static list and a bug for a reorderable one — the state attaches to
the position rather than the item. Changing a key is also a legitimate technique: it's
the cleanest way to *reset* a component's state.

**Concurrent rendering** means render can be interrupted, abandoned or replayed. The
consequences you must know:
- Side effects during render are now genuinely broken, not just impure.
- Tearing becomes possible with external stores → `useSyncExternalStore` exists.
- `useTransition` / `startTransition` mark an update as interruptible; `useDeferredValue`
  lets an expensive subtree lag behind an urgent input.

## 2. Hooks: the parts people get wrong

**Rules of hooks** exist because hooks are stored in a linked list per fiber, indexed by
call order. Conditional hooks shift the index and read someone else's state.

**`useEffect` is not a lifecycle.** It's a synchronisation primitive: "keep this external
system in sync with this state". If you can compute it during render, don't use an effect.
The three effect anti-patterns to name-drop:
- Deriving state in an effect (`setFiltered(...)` on every change) → just compute it.
- Fetching in an effect without cancellation → the race in `useAbortableSearch.ts`.
- Effects that reset state on prop change → use a `key` instead.

**`useLayoutEffect`** runs synchronously after DOM mutation, before paint. Use it only to
measure and avoid a flash. It blocks paint, and it warns in SSR.

**`useRef`** is mutable state that doesn't trigger a render. Writing a ref *during render*
is a side effect — see `usePrevious.ts`, which writes in an effect for exactly this reason.

**`useMemo` / `useCallback`** are hints, not guarantees. React may discard them. Memoise
when: (a) the computation is genuinely expensive — `runQuery` sorting 60 rows on every
keystroke in `ProductTable.tsx`; or (b) the value is a dependency of another hook or a
`memo`'d child, where identity matters. Memoising `a + b` costs more than it saves.

**The React Compiler** changes this answer, and saying so is worth points: it inserts
memoisation automatically, so manual `useMemo`/`useCallback` largely become legacy — *if*
your components are rule-following and pure.

**`useSyncExternalStore`** — see `hooks/useStore.ts`. The selector must be stable, or
`getSnapshot` changes identity every render and you loop forever. This is exactly why
Redux ships a with-selector variant that takes an equality function.

**`useActionState` / `useFormStatus` / `useOptimistic`** — the React 19 form trio, used in
`apps/next-lab/src/app/actions/`. `useFormStatus` only works in a *child* of the form.

## 3. Performance: an ordered checklist

Say this order out loud; it shows you optimise by measurement, not by reflex.

1. **Measure.** React DevTools Profiler for renders; Chrome Performance for the rest.
   "Which component re-renders, and why" — the Profiler literally tells you.
2. **Fix the state location.** Most re-render problems are state living too high. Move it
   down, or lift the expensive subtree out as `children` so it isn't re-created.
3. **Cut the work per render.** `useMemo` for real computation; virtualise long lists
   (`VirtualList.tsx`); debounce high-frequency inputs.
4. **Cut re-renders.** `React.memo` + stable props. Note `memo` is shallow: one inline
   object or arrow function prop defeats it entirely.
5. **Cut the bundle.** `React.lazy` + Suspense, route-level splitting, check what you
   actually import from big libraries.
6. **Concurrent features.** `useDeferredValue` for a heavy list beside a fast input;
   `useTransition` for a tab switch that renders a lot.

Numbers to know: INP < 200 ms, LCP < 2.5 s, CLS < 0.1.

## 4. Testing (the differentiator)

`apps/react-lab/src/__tests__/` shows the house style:

- Query by **role and accessible name**, not by test id. `getByRole('combobox')` tests
  the accessibility tree at the same time.
- `findBy*` waits; never `setTimeout` in a test.
- `userEvent` over `fireEvent` — it fires the full event sequence a real user produces.
- Mixing fake timers with `userEvent` needs
  `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`. This is the "my test
  hangs" answer.
- Test behaviour, not implementation. `ProductTable.test.tsx` asserts *"changing the
  filter resets to page 1"* — a requirement — not that a reducer was called.

If they ask about the pyramid: many unit tests on pure logic (`packages/core`), a
moderate number of component tests on behaviour, few E2E (Playwright) on critical flows.

## 5. Questions and crisp answers

- *Why does React need keys?* To match elements across renders so state and DOM nodes
  follow the item rather than the position.
- *`useEffect` vs `useLayoutEffect`?* Passive after paint vs synchronous before paint.
- *What is batching?* Multiple `setState` calls in one tick produce one render. Since 18
  this is automatic everywhere, including in promises and native handlers.
- *Controlled vs uncontrolled?* Controlled = React owns the value; uncontrolled = the DOM
  does, you read via ref. Controlled for validation and derived UI; uncontrolled for
  large forms where per-keystroke renders hurt (that's what React Hook Form exploits).
- *Context performance?* Every consumer re-renders when the value changes, and there is
  no selector. Split contexts by update frequency, memoise the value object, or use an
  external store. This is precisely why Zustand/Jotai exist.
- *How does Suspense work?* A component throws a promise (conceptually); the nearest
  boundary renders the fallback and retries when it resolves. With RSC, the server
  streams the resolved chunk into the same response.
- *Error boundary?* Class-only, `getDerivedStateFromError` + `componentDidCatch`. Does
  not catch event handlers, async code, or SSR errors — see `ErrorBoundary.tsx`.
- *State management, what would you pick?* Server state → TanStack Query (caching,
  dedup, revalidation are its whole job). URL state → the URL. Client state → `useState`
  locally, Zustand/Redux Toolkit when it's genuinely shared. Saying "it depends on which
  of the three kinds of state" is the senior answer.
