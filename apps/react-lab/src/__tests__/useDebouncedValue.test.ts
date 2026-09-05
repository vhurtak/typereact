import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';

describe('useDebouncedValue', () => {
  it('returns the initial value immediately and the latest one after the delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });
    expect(result.current).toBe('a');

    rerender({ value: 'b' });
    rerender({ value: 'c' });
    expect(result.current).toBe('a'); // still debouncing

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('c');
    vi.useRealTimers();
  });
});
