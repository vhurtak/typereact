import { PRODUCTS, formatPrice } from '@lab/core';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Fixed-height windowing in ~30 lines.
 *
 * The interview question behind it: "we render 50,000 rows and scrolling
 * janks — what do you do?" Answer: stop rendering what nobody can see. Keep a
 * spacer of `total * rowHeight` so the scrollbar stays honest, translate the
 * visible slice, and add an overscan buffer so fast scrolls do not flash blank.
 *
 * Say the limits too: fixed row height is the easy case; variable heights need
 * measurement + a position cache (that is what TanStack Virtual does), and
 * `content-visibility: auto` covers some cases with no JS at all.
 */
const ROW_HEIGHT = 32;
const OVERSCAN = 6;

export function VirtualList(): React.JSX.Element {
  const items = useMemo(
    () => Array.from({ length: 50_000 }, (_, i) => PRODUCTS[i % PRODUCTS.length]!),
    [],
  );
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(320);

  // Measure instead of hard-coding: the window must survive a resized container.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setViewportHeight(entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const slice = items.slice(first, first + visibleCount);

  return (
    <section className="card">
      <h2>Virtual list — 50,000 rows, ~20 DOM nodes</h2>
      <div
        ref={viewportRef}
        className="viewport"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div style={{ height: items.length * ROW_HEIGHT, position: 'relative' }}>
          <ul
            style={{
              transform: `translateY(${first * ROW_HEIGHT}px)`,
              position: 'absolute',
              inset: 0,
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}
          >
            {slice.map((product, index) => (
              <li key={first + index} style={{ height: ROW_HEIGHT }}>
                <span className="muted">#{first + index}</span> {product.name}
                <span className="muted"> · {formatPrice(product.priceCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="hint">
        Rendered rows: {slice.length} of {items.length.toLocaleString()}
      </p>
    </section>
  );
}
