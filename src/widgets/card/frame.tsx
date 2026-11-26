import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The one bordered box every H card draws; the host draws no border of its own. */
export function CardFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-card-line bg-card-bg px-3.5 py-3 font-sans text-[14px] leading-[1.4] text-card-ink",
        className
      )}
    >
      {children}
    </div>
  );
}

/** The card kind on the left, a status or count on the right. */
export function CardHeader({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-0.5 flex min-w-0 items-center gap-2 text-[12px] text-card-ink-3">
      <span className="min-w-0 truncate">{children}</span>
      {right != null && <span className="ml-auto flex flex-none items-center gap-1.5">{right}</span>}
    </div>
  );
}

/** The card's question answered in sentence case, with a muted tail. */
export function CardAnswer({ children, tail }: { children: ReactNode; tail?: ReactNode }) {
  return (
    <div className="mb-2.5 text-[15px] font-medium [overflow-wrap:anywhere] text-card-ink">
      {children}
      {tail && <span className="font-normal text-card-ink-3"> · {tail}</span>}
    </div>
  );
}

/** A section label with an optional right-hand legend. */
export function CardSection({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-2 mb-1 flex gap-2 text-[12px] text-card-ink-3">
      <span>{children}</span>
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

/** The last line of a cut list. */
export function MoreLine({ children }: { children: ReactNode }) {
  return <div className="pt-1 text-[12px] text-card-ink-3">{children}</div>;
}

/** A tight list row: content that grows, then fixed right columns. */
export function TightRow({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div title={title} className="flex min-w-0 items-center gap-2.5 py-[3px]">
      {children}
    </div>
  );
}

/** A label, a visual and a value on one grid row. */
export function LabelRow({ label, children, value }: { label: string; children: ReactNode; value?: ReactNode }) {
  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-2.5 py-1">
      <span className="text-[12px] text-card-ink-3">{label}</span>
      <div className="min-w-0">{children}</div>
      <span className="text-right">{value}</span>
    </div>
  );
}

/** Mono, tabular figures for any number a card shows. */
export function Num({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12.5px] whitespace-nowrap tabular-nums", className)}>{children}</span>;
}
