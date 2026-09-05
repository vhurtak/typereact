import { useEffect, useRef } from 'react';

/**
 * The value from the previous committed render.
 * Note the ref is written in an EFFECT, not during render — writing a ref during
 * render is a side effect and breaks under StrictMode / concurrent replay.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
