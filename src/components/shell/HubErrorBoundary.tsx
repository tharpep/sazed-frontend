import { Component, type ReactNode } from "react";

/** Keep a renderable error state when a hub view throws. */
export class HubErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center text-ink">
        <p className="max-w-sm text-body">The console failed to load this view.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 rounded-lg border border-line bg-surface px-4 text-body text-ink transition-colors hover:bg-raised"
        >
          Reload
        </button>
      </div>
    );
  }
}
