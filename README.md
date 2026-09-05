# type-react — senior frontend / fullstack prep

A runnable monorepo, not a reading list. The **same four components** are built twice —
once in React, once in Angular — on top of one framework-agnostic core package, so the
only difference left between them is the reactivity model. That comparison is the thing
interviewers actually probe when they ask "you've done React, can you do Angular?" (or
the reverse).

```
packages/core     framework-agnostic logic + 18 unit tests (the live-coding drills)
apps/react-lab    React 19 + Vite + Vitest + Testing Library
apps/angular-lab  Angular 20, standalone, signals, ZONELESS (no zone.js at all)
apps/next-lab     Next.js 15 App Router: RSC, streaming, server actions, route handlers
apps/nest-api     NestJS 11: DI, DTO validation, guards, interceptors, filters, versioning
docs/             the written prep kit — start with docs/README.md
```

## Quick start

```bash
npm install && npm run build:core
```

Then pick a lab:

```bash
npm run dev:react     # http://localhost:5173
```
```bash
npm run dev:angular   # http://localhost:4200
```
```bash
npm run dev:next      # http://localhost:3000
```
```bash
npm run dev:nest      # http://localhost:3001/v1/products
```

Tests:

```bash
npm run test          # core + react-lab
```
```bash
npm run test -w nest-api
```

> `@lab/core` is consumed from `dist/`, so run `npm run build:core` after changing it
> (or `npm run dev -w @lab/core` to watch).

## The four twinned demos

| Demo | React | Angular | The question it answers |
|---|---|---|---|
| Typeahead | `useDebouncedValue` + `useEffect` + `AbortController` | `debounceTime` + `switchMap`, **and** a second version with `resource()` | Race conditions, cancellation, cleanup |
| Product table | `useReducer` + `useMemo` | `signal` + `computed` | Derived state, memoisation, coupled state invariants |
| Virtual list | scroll state + slice + spacer | same maths, `computed` | Rendering 50k rows without jank |
| Store + undo/redo | `useSyncExternalStore` | `subscribe` → `signal` | What state libraries actually are |

Every one of these is a real interview task. Read both implementations side by side —
that is the whole point of the repo.

## Where to start

1. `docs/README.md` — the 4-week plan and what the market is actually asking for.
2. `docs/06-live-coding/` — 20 drills, each mapped to code in this repo, with time budgets.
3. `docs/05-system-design/` — a framework plus 6 worked frontend system-design problems.
4. `docs/03-angular/react-vs-angular.md` — the translation table, if one of the two is new to you.

## Verified toolchain

React 19.2 · Angular 20.3 (zoneless) · Next.js 15.5 · NestJS 11.2 · TypeScript 5.8 ·
Vite 7 · Vitest 3 · Node 26. All four apps build clean and all 26 tests pass.
