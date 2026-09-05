import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * The one thing that still REQUIRES a class component in 2026: there is no hook
 * equivalent of `componentDidCatch` / `getDerivedStateFromError`.
 *
 * What it does not catch (a favourite follow-up): event handlers, async code,
 * SSR, and errors thrown inside the boundary itself. For those you need a
 * try/catch or a global `window.onerror` / `unhandledrejection` listener.
 */
interface Props {
  readonly children: ReactNode;
  readonly fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Real app: ship to Sentry/Datadog here, with info.componentStack.
    console.error('Caught by boundary:', error, info.componentStack);
  }

  readonly reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      this.props.fallback?.(error, this.reset) ?? (
        <div className="card" role="alert">
          <h2>Something broke</h2>
          <p className="muted">{error.message}</p>
          <button type="button" onClick={this.reset}>
            Try again
          </button>
        </div>
      )
    );
  }
}
