import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Full-height page frame around a PageBody that scrolls. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex h-full min-h-0 flex-col bg-bg", className)}>{children}</div>;
}

/** Scrolling content column: left-aligned with a max width, so wide screens get a real layout. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className={cn(
          "flex w-full max-w-5xl flex-col gap-5 px-4 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:px-8 md:pt-7",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
