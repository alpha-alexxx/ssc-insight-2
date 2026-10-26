"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; onReset?: () => void };
type State = { error: Error | null };

/**
 * Catches render-time errors in the subtree, logs them to the server (when
 * wired), and shows a recoverable fallback instead of a white screen.
 *
 * Server-side structured logging is intentionally NOT enabled here to avoid
 * coupling the boundary to a server logger; production should hook this up
 * to /api/client-error or an APM SDK. For now we console.error for dev.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <main className="mx-auto max-w-lg px-5 py-20" role="alert">
          <h1 className="font-serif text-3xl mb-3">Something went wrong</h1>
          <p className="muted mb-6 text-sm leading-relaxed">
            The dashboard hit an unexpected error while rendering. Your data is
            safe — try reloading the view, or refresh the page if the issue
            persists.
          </p>
          <pre className="text-xs bg-soft border border-rule-soft p-3 mb-6 overflow-auto max-h-48">
            {this.state.error.message}
          </pre>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="border border-rule px-4 py-2 hover:bg-soft"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-ink text-paper px-4 py-2 hover:bg-accent"
            >
              Reload page
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
