import { useEffect, useRef } from 'react';

/**
 * Subscribe without re-subscribing on every render.
 *
 * The "latest ref" pattern: keep the handler in a ref so the effect depends only
 * on the event name and target. Without it, an inline arrow handler tears down
 * and re-adds the listener on every single render.
 */
export function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  target: Window | HTMLElement | null = typeof window === 'undefined' ? null : window,
): void {
  const saved = useRef(handler);
  useEffect(() => {
    saved.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!target) return;
    const listener = (event: Event): void => saved.current(event as WindowEventMap[K]);
    target.addEventListener(type, listener);
    return () => target.removeEventListener(type, listener);
  }, [type, target]);
}
