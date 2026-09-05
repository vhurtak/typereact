import { PRODUCTS, formatPrice, runQuery, defaultQuery } from '@lab/core';
import Form from 'next/form';

/**
 * URL as state: filtering done entirely on the server, no client JS.
 *
 * This is the answer to "how would you make a filterable list shareable and
 * back-button friendly?" — put the state in `searchParams`. `next/form` posts
 * to the same route as a GET with the field names as query params, so the page
 * works with JavaScript disabled and gets client-side navigation when it is on.
 *
 * `searchParams` is a Promise in Next 15, and reading it makes the route
 * dynamic — this page cannot be statically rendered, by definition.
 */
export const metadata = { title: 'Search params' };

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = '', page = '1' } = await searchParams;
  const result = runQuery(PRODUCTS, {
    ...defaultQuery,
    search: q,
    page: Number.parseInt(page, 10) || 1,
    pageSize: 8,
  });

  return (
    <section className="card">
      <h2>Search — state lives in the URL</h2>
      <Form action="/search">
        <input name="q" defaultValue={q} placeholder="Search products…" aria-label="Search" />
        <button type="submit">Search</button>
      </Form>

      <p className="muted">
        {result.total} match(es) · page {result.page} of {result.pageCount}
      </p>
      <ul>
        {result.rows.map((product) => (
          <li key={product.id}>
            {product.name} <span className="muted">{formatPrice(product.priceCents)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
