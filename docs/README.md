# The prep kit

Priority order for this repo, as chosen: **live coding first, system design second,
theory third.** The docs are ordered that way in practice even though the folders are
numbered by topic.

## What senior frontend / fullstack postings actually ask for (2026)

Read from a sweep of senior job ads, in rough order of frequency:

| Signal | How often | What it means for you |
|---|---|---|
| TypeScript, strict | near-universal | Not "I use TS" — generics, unions, inference, `unknown` vs `any` |
| React 18/19 | dominant on frontend | Hooks internals, Suspense, RSC awareness, performance |
| **Next.js** | the default React meta-framework | App Router, RSC vs client, caching, server actions |
| Testing (Vitest/Jest + RTL/Playwright) | very common, rarely prepared for | Being the candidate who writes a test unprompted is a real edge |
| Node.js | required for "fullstack" | Event loop, streams, HTTP, async patterns |
| **NestJS** | the common Node framework in enterprise/fullstack ads | DI, modules, DTO validation, guards/interceptors |
| Angular | a large, well-paid, less-crowded segment | Signals, standalone, zoneless, RxJS |
| System design (frontend) | almost every senior loop | Rendering strategy, state, caching, perf budgets |
| Web perf / Core Web Vitals | frequent | LCP/INP/CLS, bundle budgets, what you'd actually measure |
| Accessibility | often listed, rarely tested deeply | Roles, keyboard, `aria-live` — cheap to demonstrate |

**The strategic read:** Next.js is the highest-leverage thing to be fluent in for React
roles; Angular is the highest-leverage *differentiator*, because far fewer candidates
can speak to signals and zoneless credibly. This repo covers both, deliberately.

## A 4-week plan

Assumes ~10 h/week. Compress or stretch as needed.

### Week 1 — TypeScript + the core package
- Read `docs/01-typescript/`. Do the exercises in a scratch file, not in your head.
- Delete `packages/core/src/lru.ts` and rewrite it from scratch. Then `timing.ts`, then `store.ts`.
  The tests are your spec — you already have them.
- Target: `npm run test:core` green from an empty file, under 20 min per module.

### Week 2 — React depth
- Read `docs/02-react/`. Then rebuild `Typeahead.tsx` from a blank file, no reference.
- Rebuild `ProductTable.tsx` — the `useReducer` version, not five `useState`s.
- Write one new test in `react-lab` for something not currently covered (`VirtualList`, `ErrorBoundary`).
- Target: typeahead from blank to working, with cancellation, in 25 minutes.

### Week 3 — Angular + Node
- Read `docs/03-angular/react-vs-angular.md`. Run both labs side by side in two windows.
- Rewrite `product-table.component.ts` from the React version, and vice versa. This is the
  single best exercise in the repo for interviews that ask about both.
- Read `docs/04-node/`. Add a `POST /v1/products` endpoint to `nest-api` with a DTO and a test.

### Week 4 — System design + rehearsal
- Read `docs/05-system-design/`. Do two problems out loud, on a timer, with a whiteboard.
- Run the drill list in `docs/06-live-coding/` cold, timed.
- Prepare three stories (STAR) about: a performance win, a bad architectural decision you
  reversed, and a disagreement you handled. Rehearse them out loud once.

## How to use the code during prep

Do not read the labs like documentation. For each demo:

1. Read the doc comment at the top of the file, and nothing else.
2. Close it. Implement the component from the description.
3. Diff yours against the repo's. The gaps are your study list.

The comments in the source are written as *interview answers*, not as code explanations —
they say what to say out loud, and what the follow-up question will be.
