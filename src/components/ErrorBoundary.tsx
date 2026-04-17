import * as React from "react";

import { Button } from "@/components/ui/button";

type ErrorBoundaryState = {
  error: Error | null;
  componentStack?: string;
};

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // This provides the missing context we need to identify which component is breaking.
    console.error("[ErrorBoundary] Render error:", error);
    console.error("[ErrorBoundary] Component stack:\n", errorInfo.componentStack);
    this.setState({ componentStack: errorInfo.componentStack });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen bg-background text-foreground p-6">
        <section className="max-w-3xl mx-auto bg-card border border-border rounded-xl shadow-card p-6">
          <header className="space-y-2">
            <h1 className="font-display text-2xl font-bold">Something broke</h1>
            <p className="text-muted-foreground">
              A UI component crashed while rendering. The details below help us pinpoint and fix it.
            </p>
          </header>

          <div className="mt-6 space-y-3">
            <div className="rounded-lg bg-secondary/40 border border-border p-3">
              <p className="text-sm font-medium">Error</p>
              <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
                {this.state.error?.stack || this.state.error?.message}
              </pre>
            </div>

            {this.state.componentStack && (
              <div className="rounded-lg bg-secondary/40 border border-border p-3">
                <p className="text-sm font-medium">Component stack</p>
                <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
                  {this.state.componentStack}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="default" onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Button variant="outline" onClick={() => this.setState({ error: null, componentStack: undefined })}>
              Try again
            </Button>
          </div>
        </section>
      </main>
    );
  }
}
