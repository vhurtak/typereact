import { PRODUCTS, formatPrice, sleep } from '@lab/core';
import Link from 'next/link';
import { Suspense } from 'react';

/**
 * Streaming with Suspense.
 *
 * The heading below renders instantly; <SlowList> suspends and streams in when
 * its await resolves. Two things make this work and are worth saying out loud:
 *   1. The component is async — only Server Components can be.
 *   2. The Suspense boundary is what decides WHERE the page splits. Move the
 *      boundary and you move the perceived-performance win.
 *
 * `loading.tsx` in this folder is sugar for wrapping the whole page in one
 * Suspense boundary; explicit <Suspense> gives you finer control.
 */
export const metadata = { title: 'Streaming' };

async function SlowList() {
  await sleep(1200); // pretend this is a slow upstream call
  return (
    <ul>
      {PRODUCTS.slice(0, 8).map((product) => (
        <li key={product.id}>
          <Link href={`/products/${product.id}`}>{product.name}</Link>{' '}
          <span className="muted">{formatPrice(product.priceCents)}</span>
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading products">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="skeleton" style={{ width: `${60 + ((index * 7) % 35)}%` }} />
      ))}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <section className="card">
      <h2>Streaming — the shell flushes before the data</h2>
      <p className="muted">
        This paragraph is in the first flush. The list below arrives ~1.2s later over the same
        response, with no client-side fetch and no loading state in your own code.
      </p>
      <Suspense fallback={<ListSkeleton />}>
        <SlowList />
      </Suspense>
    </section>
  );
}
