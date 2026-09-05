import { PRODUCTS, formatPrice } from '@lab/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * Dynamic segment + metadata + static generation.
 *
 * Next 15 note that trips people up in interviews: `params` is a PROMISE now.
 * You must await it, in both the page and `generateMetadata`.
 */
type Params = Promise<{ id: string }>;

/** Pre-render these paths at build time; everything else renders on demand. */
export function generateStaticParams() {
  return PRODUCTS.slice(0, 10).map((product) => ({ id: product.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const product = PRODUCTS.find((candidate) => candidate.id === id);
  return { title: product?.name ?? 'Not found' };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { id } = await params;
  const product = PRODUCTS.find((candidate) => candidate.id === id);

  // `notFound()` throws a special error the router catches and maps to
  // not-found.tsx with a 404 status. Do not hand-roll a 200 "not found" page.
  if (!product) notFound();

  return (
    <section className="card">
      <h2>{product.name}</h2>
      <p className="muted">{product.category}</p>
      <p>{formatPrice(product.priceCents)}</p>
      <p>Rating {product.rating.toFixed(1)} · {product.inStock ? 'In stock' : 'Out of stock'}</p>
    </section>
  );
}
