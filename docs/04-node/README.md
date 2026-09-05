# Node, Next.js and NestJS

## 1. Node fundamentals they still ask about

**The event loop, in phases:** timers → pending callbacks → poll → check (`setImmediate`)
→ close. `process.nextTick` and promise microtasks drain *between every phase*, and
`nextTick` runs before promises. The classic ordering question:

```js
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('tick'));
Promise.resolve().then(() => console.log('promise'));
// tick, promise, then timeout/immediate in a nondeterministic order at top level
// (inside an I/O callback, immediate always wins)
```

**Blocking is the cardinal sin.** One thread serves every request. CPU-heavy work goes to
`worker_threads`, a child process, or off the box entirely. `crypto.pbkdf2`, `zlib` and
`fs` use the libuv threadpool (default 4, `UV_THREADPOOL_SIZE`) — a real source of
mysterious latency.

**Streams and backpressure.** `readable.pipe(writable)` handles backpressure for you;
`stream.pipeline` also propagates errors and cleans up. Ask-worthy answer: "I'd stream the
CSV rather than buffering it, so memory is O(1) instead of O(file)."

**Clustering / scaling.** `cluster` or a process manager to use all cores; in containers,
one process per container and let the orchestrator scale. Graceful shutdown on SIGTERM —
stop accepting, drain in-flight, close pools — is what `enableShutdownHooks()` does in
`apps/nest-api/src/main.ts`.

**Error handling.** An unhandled rejection terminates the process by default in modern
Node. Handle at the boundary; don't swallow. `AsyncLocalStorage` is how you carry a
request id through async calls without threading it manually — the modern answer to
"how do you correlate logs?".

## 2. Next.js 15 (App Router)

`apps/next-lab` is a working tour. Build it and read the route table — the `○ ● ƒ`
legend is the mental model.

### Server vs Client Components

Everything is a Server Component until a file has `'use client'`. That directive is a
**boundary**, not a file marker: everything imported beneath it also ships to the browser.

Server Components: can be `async`, can read the database or the filesystem, never ship
their code to the client, cannot use hooks or event handlers.
Client Components: hooks, state, effects, browser APIs, event handlers.

Props crossing the boundary must be **serializable**. Functions don't cross — except
Server Actions, which cross as a reference.

The pattern to know: keep the page a Server Component, push `'use client'` down to the
smallest interactive leaf (`SubscribeForm.tsx`), and pass server-rendered content down as
`children` so it doesn't get pulled into the client bundle.

### What changed in 15 (the most likely question)

- `fetch` is **no longer cached by default**. Opt in: `cache: 'force-cache'` or
  `next: { revalidate: 60 }`.
- GET Route Handlers are **dynamic by default** (they were static in 14).
- `cookies()`, `headers()`, `params`, `searchParams` are **async** — you must await them.
  See `products/[id]/page.tsx`.
- React 19, and the `use cache` directive / PPR moving toward stable.

### Caching layers — name all four

1. **Request memoization** — the same `fetch` in one render pass runs once.
2. **Data Cache** — persistent across requests; `revalidate`, `revalidateTag`.
3. **Full Route Cache** — the rendered HTML/RSC payload for static routes.
4. **Router Cache** — client-side, in memory, for back/forward navigation.

`revalidatePath` / `revalidateTag` invalidate 2 and 3. This layered answer is what
separates "I've used Next" from "I understand Next".

### Rendering strategies

Static (SSG) · ISR (`revalidate`) · Dynamic (SSR) · Client · PPR (static shell + streamed
dynamic holes). Reading cookies or `searchParams` forces a route dynamic — that's why
`/search` in the lab is `ƒ` while `/products` is `○`.

### Server Actions — the security point

`'use server'` exposes each exported function as a public POST endpoint. **Authorize and
validate inside the action.** The UI hiding a button is not authorization. Say this
unprompted; it's a strong signal.

### Streaming

`loading.tsx` = the whole page wrapped in one Suspense boundary. Explicit `<Suspense>`
gives you finer control over where the page splits — see `products/page.tsx`, where the
shell flushes immediately and the slow list arrives 1.2 s later in the same response.

## 3. NestJS 11

`apps/nest-api` is a small but complete example.

### Request lifecycle — memorise the order

```
middleware → guards → interceptors (pre) → pipes → handler
           → interceptors (post) → exception filters
```

That order answers most "where would you put X?" questions:
- Authentication/authorization → **guard** (runs early, can short-circuit).
- Validation/transformation → **pipe** (`ValidationPipe` + DTO).
- Logging, timing, response shaping, caching → **interceptor** (sees both directions).
- Error envelope → **exception filter**.

### DI

Providers are singletons by default. Module-scoped: a provider must be `exports`ed to be
injectable elsewhere. `Scope.REQUEST` exists but forces per-request instantiation of the
whole subtree — mention the cost. `forwardRef` for circular deps is a smell worth naming.

### DTOs and validation

Classes, not interfaces — decorators need runtime metadata. `whitelist: true` +
`forbidNonWhitelisted: true` is the combination that actually protects against mass
assignment. The modern alternative is zod (`nestjs-zod`): one schema for validation and
inference.

### Testing

`Test.createTestingModule` builds a real container; `.overrideProvider(X).useValue(fake)`
swaps a dependency. E2E with `supertest` against the compiled app.

### Nest vs Next — when asked to choose

Next.js is a **frontend framework with a server**: excellent for BFF-shaped work,
server actions, rendering. NestJS is a **backend framework**: modules, DI, background
jobs, queues, microservices, WebSockets, a real domain layer. A very common production
shape is both — Next for the UI and BFF, Nest for the domain API. Say that.

## 4. Cross-cutting backend questions

- *REST vs GraphQL vs tRPC?* REST for public/cacheable contracts; GraphQL when many
  clients need different shapes (and you're ready for N+1, dataloader, and query-cost
  limits); tRPC when the client and server are one TypeScript codebase.
- *How do you version an API?* URI (`/v1`) is what `nest-api` does; header and
  media-type versioning also exist. The real answer is additive change and deprecation
  windows, not versioning everything.
- *Auth?* Short-lived access JWT + rotating refresh token in an httpOnly, Secure,
  SameSite cookie. Don't put a JWT in localStorage — XSS reads it.
- *Idempotency?* Client-supplied `Idempotency-Key` on POST, stored with the result.
- *N+1?* Batch with dataloader, or join. Know how to spot it in a query log.
