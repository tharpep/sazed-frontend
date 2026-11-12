import type { ReactNode } from "react";

import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { MoreSheet } from "@/components/layout/MoreSheet";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { useVisualViewportHeight } from "@/hooks/useVisualViewportHeight";
import { isTauri } from "@/lib/isTauri";

export function AppShell({ children }: { children: ReactNode }) {
  useVisualViewportHeight();

  return (
    // The installed iPhone app draws under the status bar and Dynamic Island (black-translucent +
    // viewport-fit=cover), so the shell pads itself by the safe-area insets. Bottom is left to
    // BottomTabBar, which pads for the home indicator itself.
    // From sm up the page sits on an inset panel over the darker shell, so the sidebar recedes and
    // content leads (DESIGN.md, Layout). Phones keep the page edge to edge.
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-bg pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] text-ink [height:var(--app-height,100dvh)] sm:bg-sidebar">
      {/* Window chrome for the frameless Tauri window only; on the web it was a wasted strip. */}
      {isTauri && <TitleBar />}
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-bg sm:my-2 sm:mr-2 sm:rounded-xl sm:border sm:border-line">
          {children}
        </main>
      </div>
      <BottomTabBar />
      <MoreSheet />
      <CommandPalette />
    </div>
  );
}
