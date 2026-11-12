import { useRef, type ReactNode } from "react";

import { useHubScroll } from "@/hooks/useHubScroll";

/** The hub shell's content slot for one view. `scrollKey` keeps that view's scroll position;
 * null leaves scrolling to the page. */
export function HubContent({ scrollKey, children }: { scrollKey: string | null; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useHubScroll(ref, scrollKey);
  return (
    <div ref={ref} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
