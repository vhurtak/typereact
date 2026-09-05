/**
 * debounce / throttle / sleep — the classic whiteboard warm-ups.
 * Read the trailing-vs-leading edge notes before an interview; that nuance is
 * usually the actual question, not the closure.
 */

export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
  flush(): void;
}

/** Trailing-edge debounce: fires `wait` ms after the LAST call. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: A | undefined;

  const debounced = (...args: A): void => {
    pending = args;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      const call = pending;
      pending = undefined;
      if (call) fn(...call);
    }, wait);
  };

  debounced.cancel = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  };

  debounced.flush = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    const call = pending;
    pending = undefined;
    if (call) fn(...call);
  };

  return debounced;
}

/** Leading-edge throttle with a trailing call: at most one run per `wait` ms. */
export function throttle<A extends unknown[]>(fn: (...args: A) => void, wait: number): Debounced<A> {
  // -Infinity, not 0: with a mocked clock at t=0, `0` would suppress the leading call.
  let last = -Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: A | undefined;

  const invoke = (args: A): void => {
    last = Date.now();
    fn(...args);
  };

  const throttled = (...args: A): void => {
    const elapsed = Date.now() - last;
    if (elapsed >= wait) {
      invoke(args);
      return;
    }
    pending = args;
    if (timer === undefined) {
      timer = setTimeout(() => {
        timer = undefined;
        const call = pending;
        pending = undefined;
        if (call) invoke(call);
      }, wait - elapsed);
    }
  };

  throttled.cancel = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  };

  throttled.flush = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    const call = pending;
    pending = undefined;
    if (call) invoke(call);
  };

  return throttled;
}

export const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
