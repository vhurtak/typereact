import { describe, expect, it, vi } from 'vitest';
import { debounce, throttle } from './timing.js';

describe('debounce', () => {
  it('fires once, with the last arguments', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const d = debounce(spy, 100);
    d('a');
    d('b');
    vi.advanceTimersByTime(99);
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledExactlyOnceWith('b');
    vi.useRealTimers();
  });

  it('cancel() drops the pending call, flush() runs it now', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const d = debounce(spy, 100);
    d('x');
    d.cancel();
    vi.advanceTimersByTime(200);
    expect(spy).not.toHaveBeenCalled();
    d('y');
    d.flush();
    expect(spy).toHaveBeenCalledExactlyOnceWith('y');
    vi.useRealTimers();
  });
});

describe('throttle', () => {
  it('runs on the leading edge and once more on the trailing edge', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const spy = vi.fn();
    const t = throttle(spy, 100);
    t(1);
    t(2);
    t(3);
    expect(spy).toHaveBeenCalledExactlyOnceWith(1);
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(3);
    vi.useRealTimers();
  });
});
