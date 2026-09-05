import { isAbort, remote, searchProducts, type Product, type RemoteData } from '@lab/core';
import { useEffect, useState } from 'react';

/**
 * The typeahead race-condition exercise — probably the single most common
 * senior React live-coding task.
 *
 * Three bugs it has to avoid:
 *   1. Stale response overwriting a newer one  -> AbortController per effect run.
 *   2. setState after unmount                  -> the same cleanup covers it.
 *   3. An abort surfacing as a user-facing error -> `isAbort` guard.
 *
 * Follow-up they will ask: "how would you cache?" -> wrap `searchProducts` in
 * `singleFlight` + an `LruCache` from @lab/core, or hand it to React Query.
 */
export function useAbortableSearch(query: string): RemoteData<Product[]> {
  const [state, setState] = useState<RemoteData<Product[]>>(remote.idle);

  useEffect(() => {
    if (!query.trim()) {
      setState(remote.idle());
      return;
    }

    const controller = new AbortController();
    setState(remote.loading());

    searchProducts(query, { signal: controller.signal })
      .then((products) => {
        if (controller.signal.aborted) return;
        setState(remote.success(products));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbort(error)) return;
        setState(remote.error(error instanceof Error ? error : new Error(String(error))));
      });

    return () => controller.abort();
  }, [query]);

  return state;
}
