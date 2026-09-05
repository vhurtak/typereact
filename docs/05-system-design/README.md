# Frontend system design

A 45-minute round with no right answer. You are being graded on: do you scope before you
solve, do you justify trade-offs, and do you know what you'd measure.

## The framework (use it every time)

**1. Requirements — 5 min.** Ask before you draw.
- Who uses it, how many, on what devices and networks?
- Read-heavy or write-heavy? Real-time or eventually consistent?
- SEO required? Offline? i18n? Accessibility target (WCAG AA is usually the answer)?
- What's the existing stack, and what am I allowed to change?

**2. Non-functional targets — 2 min.** Name numbers, they anchor everything after:
LCP < 2.5 s, INP < 200 ms, CLS < 0.1, JS budget ~170 KB gzipped on the critical path,
p95 API latency, uptime.

**3. High-level architecture — 10 min.** Draw boxes: client, CDN/edge, BFF, services.
Decide the **rendering strategy** and say why (this is the frontend-specific core):
static / ISR / SSR / CSR / streaming+PPR.

**4. Data flow and state — 10 min.** The three kinds of state, always:
- **Server state** — cache, dedup, revalidation → TanStack Query / RTK Query / `resource()`.
- **URL state** — filters, pagination, tabs. Shareable and back-button correct.
- **Client state** — ephemeral UI. Local first; a store only when genuinely shared.

**5. Component/module design — 5 min.** Boundaries, ownership, what's shared, how teams
avoid colliding.

**6. Deep dive — 10 min.** They'll pick one thread. Have opinions ready on caching,
pagination, offline, real-time, error handling.

**7. Trade-offs and what you'd measure — 3 min.** Close by naming what you gave up and
how you'd know it was wrong. This is the part most candidates skip and it's the most
senior-sounding part of the whole answer.

## Cross-cutting building blocks

**Caching.** Browser HTTP cache (`Cache-Control`, `s-maxage`, `stale-while-revalidate`) →
CDN → app-level data cache → in-memory client cache. `stale-while-revalidate` is the
single most useful header to mention. On the client, an LRU with a TTL and request
deduplication — you've written both (`LruCache`, `singleFlight` in `packages/core`).

**Pagination.** Offset is simple and breaks under concurrent inserts (rows shift, items
duplicate or vanish). Cursor/keyset is stable and is the right answer for infinite scroll
and any high-write table. Say the trade-off: cursors can't jump to page 47.

**Real-time.** Polling (simple, wasteful) → long-poll → **SSE** (one-way, HTTP, auto
reconnect, cheapest correct answer for feeds/notifications) → **WebSocket** (bidirectional,
needs its own scaling and reconnect/backoff logic). Choose SSE unless you need to write.

**Offline / resilience.** Service worker for shell + assets; IndexedDB for data; an
outbox queue for writes with conflict resolution (last-write-wins vs CRDT). Mention that
sync conflicts are a product decision, not a technical one.

**Error handling.** Boundaries per route and per widget so one failure doesn't blank the
page; retry with exponential backoff **and jitter** (`retry()` in `packages/core`);
circuit-break a failing dependency; always show a recovery affordance.

**Performance.** Budget → measure (RUM + lab) → split by route → lazy-load below the
fold → virtualise long lists → preload the critical font and hero image →
`content-visibility` for offscreen sections.

**Observability.** RUM for Web Vitals, error tracking with source maps and release
tagging, a trace id from the browser through the BFF (`AsyncLocalStorage`), and feature
flags so you can roll back without a deploy.

## Six worked problems

For each: the framing that scores, and the trap.

### 1. News feed / infinite scroll
**Key decisions.** Cursor pagination. Virtualise (fixed vs dynamic heights — dynamic
needs measurement + a position cache). Optimistic like/comment. Prefetch page n+1 on
approach. Preserve scroll position on back — restore the cursor and offset from history
state.
**Rendering.** SSR/ISR the first screen for LCP and SEO, client-fetch subsequent pages.
**Trap.** Forgetting that images shift layout — reserve dimensions or you fail CLS.

### 2. Typeahead / autocomplete at scale
**Key decisions.** Debounce 200–300 ms; cancel in-flight requests (`AbortController` or
`switchMap`); cache by query prefix in an LRU; minimum query length; dedup identical
in-flight requests; full keyboard support and `aria-live` result count.
**Scale.** Edge-cached popular prefixes; a trie server-side; rank by popularity.
**Trap.** The race condition. You've implemented the fix twice in this repo — say it
explicitly, it's the thing they're checking.

### 3. Collaborative document editor
**Key decisions.** CRDT (Yjs) vs OT (harder, needs a central server). WebSocket transport
with presence and awareness. Local-first: write to IndexedDB, sync in the background.
Undo must be *per-user*, not global — mention this, it's the detail that shows you've
thought about it.
**Trap.** Treating it as a "save" problem. It's a merge problem.

### 4. Design system / component library for many teams
**Key decisions.** Tokens (JSON) → CSS custom properties → components. Headless
primitives (Radix / CDK) + your styling, so accessibility isn't re-litigated per
component. Semver + changesets, a visual regression suite (Chromatic/Playwright), a
codemod story for breaking changes, and a deprecation policy.
**Trap.** Over-abstracting early. Ship three products' worth of real usage before
generalising.

### 5. Dashboard with 20 widgets and live data
**Key decisions.** One multiplexed SSE/WS connection, not 20. Per-widget Suspense and
error boundaries so one slow query doesn't hold the page. Virtualise off-screen widgets
with `content-visibility`. Coalesce updates (throttle to animation frames) so a fast feed
doesn't peg the main thread. Server-side aggregation — never ship 100k raw rows to
compute an average in the browser.
**Trap.** Re-rendering the whole grid on every tick. Push state down per widget.

### 6. Checkout / multi-step form
**Key decisions.** URL-driven steps (shareable, back-button correct). Validate on the
client for UX and on the server for truth. Idempotency key on submit. Persist a draft to
localStorage. Optimistic UI is *wrong* here — payment needs a confirmed result.
**Trap.** Losing the user's data on a refresh, and double-charging on a double-click.

## Rehearsal

Do two of these out loud, on a 45-minute timer, drawing as you go. Record yourself once —
it's unpleasant and it's the fastest way to hear your own filler words and the places you
jumped to a solution before scoping.
