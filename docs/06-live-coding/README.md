# Live coding drills

Everything here is implemented in this repo. The workflow is always the same:

1. Read only the drill description below.
2. Open a blank file, set a timer, implement it.
3. Run the existing tests against your version.
4. Diff against the repo's implementation.

Run tests continuously while you drill:

```bash
npm run test:watch -w @lab/core
```

## Tier 1 — vanilla JS/TS (10–15 min each)

These come up as warm-ups and as phone screens. Tests already exist for all of them.

| # | Drill | Solution | Tests | The follow-up they'll ask |
|---|---|---|---|---|
| 1 | `debounce(fn, wait)` with `cancel`/`flush` | `core/src/timing.ts` | `timing.test.ts` | Leading vs trailing edge |
| 2 | `throttle(fn, wait)` | `core/src/timing.ts` | `timing.test.ts` | Why `last = -Infinity`, not `0` |
| 3 | LRU cache, O(1) | `core/src/lru.ts` | `lru.test.ts` | Do it without `Map` ordering (linked list) |
| 4 | Typed event emitter | `core/src/emitter.ts` | — | Why copy the Set before dispatch |
| 5 | `promisePool(tasks, n)` | `core/src/async.ts` | `async.test.ts` | Preserve order? Fail fast or collect? |
| 6 | `retry` with exponential backoff + jitter | `core/src/async.ts` | `async.test.ts` | Which errors must not be retried |
| 7 | `singleFlight` / request dedup | `core/src/async.ts` | `async.test.ts` | Where the cache key comes from |
| 8 | Observable store with `subscribe` | `core/src/store.ts` | `store.test.ts` | How you avoid notifying on no-op |
| 9 | Undo/redo history | `core/src/store.ts` | `store.test.ts` | Bounding the stack; per-user undo |
| 10 | `Result<T,E>` + `map`/`flatMap` | `core/src/result.ts` | — | Errors as values vs `throw` |

Also worth being able to write cold, no scaffolding here: `Array.prototype.flat`,
`Function.prototype.bind`, a promise-based `sleep`, `Promise.all` from scratch, deep
clone (and why `structuredClone` is usually the answer now), deep equal, `groupBy`,
curry, and a memoize with a `Map` key strategy.

## Tier 2 — React components (20–30 min each)

| # | Drill | Solution | The bug they're checking for |
|---|---|---|---|
| 11 | `useDebouncedValue(value, ms)` | `react-lab/src/hooks/useDebouncedValue.ts` | Timer not cleaned up on unmount |
| 12 | Typeahead with cancellation | `hooks/useAbortableSearch.ts` + `components/Typeahead.tsx` | **The race condition.** Stale response overwrites a newer one |
| 13 | Sortable/filterable/paginated table | `components/ProductTable.tsx` | Filter change doesn't reset the page |
| 14 | Virtualised list | `components/VirtualList.tsx` | Scrollbar length wrong; no overscan |
| 15 | Error boundary | `components/ErrorBoundary.tsx` | Trying to do it with hooks |
| 16 | Bind an external store | `hooks/useStore.ts` + `components/StoreCounter.tsx` | Unstable selector → infinite loop |
| 17 | `usePrevious` | `hooks/usePrevious.ts` | Writing the ref during render |
| 18 | `useEventListener` with a latest-ref | `hooks/useEventListener.ts` | Re-subscribing on every render |

Not in the repo, but on the same list — write them if you have time: a modal with focus
trap and Escape handling, an infinite-scroll hook with `IntersectionObserver`, a
controlled/uncontrolled input that supports both, a tabs component with roving tabindex,
and a `useLocalStorage` that survives a `JSON.parse` failure.

## Tier 3 — Angular equivalents (20–30 min each)

| # | Drill | Solution |
|---|---|---|
| 19 | Typeahead with `debounceTime` + `switchMap` | `angular-lab/src/app/components/typeahead.component.ts` |
| 20 | The same with `resource()` and no RxJS | `typeahead-resource.component.ts` |
| 21 | Table with `signal` + `computed` | `product-table.component.ts` |
| 22 | Virtual list with signals | `virtual-list.component.ts` |
| 23 | External store → signal, with `DestroyRef` | `store-counter.component.ts` |

**The highest-value exercise in this repo:** open the React version of a demo, close it,
and write the Angular one from memory — then the reverse. Interviewers for either stack
respect a candidate who can articulate the other one's model.

## Tier 4 — backend (20–30 min)

| # | Drill | Solution |
|---|---|---|
| 24 | Nest controller + service + DTO with validation | `nest-api/src/products/` |
| 25 | Logging interceptor and a global exception filter | `nest-api/src/common/` |
| 26 | Route handler with cache headers | `next-lab/src/app/api/products/route.ts` |
| 27 | Server Action with validation and `revalidatePath` | `next-lab/src/app/actions/actions.ts` |
| 28 | Streaming page with Suspense | `next-lab/src/app/products/page.tsx` |

## How to behave in the session (this is half the score)

- **Restate the problem and the constraints first.** 60 seconds. It prevents the worst
  outcome, which is solving the wrong thing well.
- **Say the approach before typing.** "I'll debounce the input, then cancel the previous
  request with an AbortController so a slow early response can't overwrite a newer one."
- **Narrate while you type**, but stop narrating when you're thinking. Silence is fine;
  say "let me think for a second" and then be quiet.
- **Write the naive version first, then improve it.** A working solution at minute 15
  beats a perfect one at minute 40.
- **Handle the edge cases out loud even if you don't code them:** empty input, unmount
  mid-request, errors, duplicate submits.
- **Offer a test.** Even one. Almost nobody does this, and it changes the read on you.
- **When stuck, say what you'd look up.** "I'd check whether `resource` takes `params` or
  `request` in this version" is fine; silently guessing is not.
- **Finish by naming what you'd do with more time.** Cache, cancel, accessibility,
  tests, error states.
