import type { ReactNode } from "react";

import { TitleBar } from "@/components/layout/TitleBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { MoreSheet } from "@/components/layout/MoreSheet";
import { useVisualViewportHeight } from "@/hooks/useVisualViewportHeight";

export function AppShell({ children }: { children: ReactNode }) {
  useVisualViewportHeight();

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-bg text-ink [height:var(--app-height,100dvh)]">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      <BottomTabBar />
      <MoreSheet />
    </div>
  );
}
