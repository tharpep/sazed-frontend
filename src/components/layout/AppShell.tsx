import type { ReactNode } from "react";

import { HubErrorBoundary } from "@/components/shell/HubErrorBoundary";
import { HubFrame } from "@/components/shell/HubFrame";
import { useVisualViewportHeight } from "@/hooks/useVisualViewportHeight";

export function AppShell({ children, docked }: { children: ReactNode; docked?: ReactNode }) {
  useVisualViewportHeight();
  return (
    <HubErrorBoundary>
      <HubFrame docked={docked}>{children}</HubFrame>
    </HubErrorBoundary>
  );
}
