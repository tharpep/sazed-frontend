import { Component, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface HubErrorBoundaryProps {
  children: ReactNode;
  /** In the page slot, so the rail, tabs and bar stay usable; otherwise over the whole window. */
  inline?: boolean;
}

/** Keep a renderable error state when a hub view throws. */
export class HubErrorBoundary extends Component<HubErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center text-ink",
          this.props.inline ? "min-h-0 flex-1" : "fixed inset-0"
        )}
      >
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
