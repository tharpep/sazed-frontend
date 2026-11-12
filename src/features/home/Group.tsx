import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface GroupProps {
  name: string;
  count: number | null;
  empty: string;
  extra?: ReactNode;
  children?: ReactNode;
}

/** One of Home's groups: a quiet heading with its count, or one line when it is empty. */
export function Group({ name, count, empty, extra, children }: GroupProps) {
  return (
    <section aria-label={name} className="min-w-0">
      <h2 className="flex min-h-7 flex-wrap items-center gap-x-2 px-1 pb-1 text-meta font-medium text-ink-2 sm:px-3">
        <span>{name}</span>
        {count ? (
          <span className="font-mono font-normal text-muted tabular-nums">{count}</span>
        ) : (
          count === 0 && <span className="font-normal text-muted">{empty}</span>
        )}
        {extra && <span className="ml-auto">{extra}</span>}
      </h2>
      {count ? children : null}
    </section>
  );
}

/** A link out of Home into a list elsewhere; 44px tall on phones without growing the heading. */
export function MoreLink({ onClick, children, className }: { onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-0.5 text-meta font-normal text-muted transition-colors hover:text-ink max-sm:-my-2 max-sm:min-h-11 max-sm:px-1",
        className
      )}
    >
      {children}
      <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
    </button>
  );
}
