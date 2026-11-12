import { Component, type ReactNode } from "react";

import { useShellStore } from "@/nav/shellFlag";

function backToOld() {
  useShellStore.getState().setShell("old");
  window.location.reload();
}

/** If the hub shell throws, offer the old layout. The installed iPhone app has no address bar to
 * type ?shell=old into, so this button is its only way back. */
export class HubErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center text-ink">
        <p className="max-w-sm text-body">The new layout failed to load.</p>
        <button
          type="button"
          onClick={backToOld}
          className="min-h-11 rounded-lg border border-line bg-surface px-4 text-body text-ink transition-colors hover:bg-raised"
        >
          Switch to the old layout
        </button>
      </div>
    );
  }
}
