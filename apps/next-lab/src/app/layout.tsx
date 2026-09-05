import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

/**
 * The root layout is a SERVER component and it never re-renders on navigation —
 * that is the whole point of nested layouts. State inside a layout survives a
 * route change; state inside a page does not.
 */
export const metadata: Metadata = {
  title: { default: 'Next Lab', template: '%s · Next Lab' },
  description: 'App Router patterns for senior interviews',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>
          <h1>Next Lab</h1>
          <nav>
            <Link href="/">Overview</Link>
            <Link href="/products">Streaming</Link>
            <Link href="/search">Search params</Link>
            <Link href="/actions">Server actions</Link>
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
