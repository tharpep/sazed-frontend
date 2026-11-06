import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Full-height page frame: a PageHeader on top and a PageBody that scrolls. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex h-full min-h-0 flex-col bg-bg", className)}>{children}</div>;
}

interface PageHeaderProps {
  title: string;
  /** Sits right after the title, e.g. a StatusPill. */
  status?: ReactNode;
  /** Right-aligned controls. */
  actions?: ReactNode;
}

export function PageHeader({ title, status, actions }: PageHeaderProps) {
  return (
    <header className="flex min-h-13 items-center gap-3 border-b border-line px-4 py-2 md:px-8">
      <h1 className="text-title font-semibold text-ink">{title}</h1>
      {status}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  );
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
