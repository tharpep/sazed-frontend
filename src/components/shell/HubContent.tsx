import { useRef, type ReactNode } from "react";

import { useHubScroll } from "@/hooks/useHubScroll";

/** The hub shell's content slot for one view, keeping that view's scroll position. */
export function HubContent({ hubView, children }: { hubView: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useHubScroll(ref, hubView);
  return (
    <div ref={ref} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
