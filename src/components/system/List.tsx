import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A titled group of rows in one bordered panel (e.g. one day of Activity). */
export function ListSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      {title && <h2 className="px-0.5 text-meta text-muted">{title}</h2>}
      <div className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {children}
      </div>
    </section>
  );
}

interface ListRowProps {
  title: ReactNode;
  description?: ReactNode;
  /** Icon (or dot) on the left; color it with a tone class. */
  leading?: ReactNode;
  /** Its own column from md up. Phones don't show it, so repeat it in `meta` if they need it. */
  time?: string;
  /** Right-aligned facts: duration, cost, counts. */
  meta?: ReactNode;
  onClick?: () => void;
  /** Set when the row opens details under itself; drives aria-expanded. */
  expanded?: boolean;
}

export function ListRow({ title, description, leading, time, meta, onClick, expanded }: ListRowProps) {
  const className = cn(
    "grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-3 px-3 py-2.5 text-left md:px-4",
    time && "md:grid-cols-[4.5rem_1.25rem_minmax(0,1fr)_auto]",
    onClick && "transition-colors hover:bg-raised/60 focus-visible:-outline-offset-2"
  );
  const body = (
    <>
      {time && <span className="hidden pt-px text-meta text-muted tabular-nums md:block">{time}</span>}
      <span className="flex h-5 items-center [&_svg]:size-4">{leading}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-body font-medium text-ink">{title}</span>
        {description && <span className="line-clamp-2 text-meta text-ink-2">{description}</span>}
      </span>
      {meta ? (
        <span className="flex flex-col items-end gap-0.5 pt-px text-caption whitespace-nowrap text-muted tabular-nums">
          {meta}
        </span>
      ) : (
        <span />
      )}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} aria-expanded={expanded} className={className}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}
