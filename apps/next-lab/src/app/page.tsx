export default function OverviewPage() {
  return (
    <>
      <section className="card">
        <h2>What to be able to explain</h2>
        <ul>
          <li>
            <strong>Server vs Client Components.</strong> Everything is a Server Component until a
            file says <code>&apos;use client&apos;</code>. That directive marks a boundary, not a
            file: everything imported below it also ships to the browser.
          </li>
          <li>
            <strong>Serialization boundary.</strong> Props crossing server → client must be
            serializable. Functions, class instances and Dates-with-methods do not cross; Server
            Actions are the escape hatch, because they cross as a reference, not as code.
          </li>
          <li>
            <strong>Streaming.</strong> <code>loading.tsx</code> / <code>&lt;Suspense&gt;</code> let
            the shell flush immediately while slow data streams in. See <code>/products</code>.
          </li>
          <li>
            <strong>Caching (Next 15).</strong> <code>fetch</code> is no longer cached by default,
            and GET route handlers are dynamic by default — the single most common &quot;what
            changed in 15?&quot; question. Opt in with <code>cache: &apos;force-cache&apos;</code>,{' '}
            <code>next: &#123; revalidate &#125;</code>, or <code>&apos;use cache&apos;</code>.
          </li>
          <li>
            <strong>Dynamic APIs are async.</strong> <code>cookies()</code>, <code>headers()</code>,{' '}
            <code>params</code> and <code>searchParams</code> are Promises in 15 — you must await
            them.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Rendering strategies, in one breath</h2>
        <ul>
          <li><strong>Static (SSG)</strong> — rendered at build, served from CDN. Marketing pages.</li>
          <li><strong>ISR</strong> — static plus <code>revalidate</code>; stale-while-revalidate at the edge. Catalogues.</li>
          <li><strong>Dynamic (SSR)</strong> — per request; needed once you read cookies/headers. Dashboards.</li>
          <li><strong>Client</strong> — after hydration; for anything that needs the DOM or per-user interactivity.</li>
          <li><strong>PPR</strong> — a static shell with dynamic holes streamed in. The direction of travel.</li>
        </ul>
      </section>
    </>
  );
}
