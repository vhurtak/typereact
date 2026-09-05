import { useEffect, useState } from 'react';

/**
 * Debounce a VALUE, not a callback.
 *
 * Interview note: this is preferable to `useCallback(debounce(fn))` because the
 * timer lives in an effect with a cleanup, so React tears it down on unmount and
 * on every dependency change. The `debounce(fn)` version leaks a timer whenever
 * the component unmounts mid-wait, and it silently captures a stale `fn`.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
