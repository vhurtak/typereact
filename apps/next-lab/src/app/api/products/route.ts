import { PRODUCTS, runQuery, defaultQuery } from '@lab/core';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Route Handler — the Web-standard Request/Response API, not Express.
 *
 * Next 15: GET handlers are DYNAMIC by default (they were cached in 14). Opt
 * back in explicitly if you want the old behaviour.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const search = request.nextUrl.searchParams.get('q') ?? '';
  const page = Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10) || 1;

  const result = runQuery(PRODUCTS, { ...defaultQuery, search, page, pageSize: 20 });

  return NextResponse.json(result, {
    headers: {
      // Edge/CDN caching is a separate axis from the Next data cache — say both.
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
