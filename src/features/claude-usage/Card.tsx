import type { ReactNode } from "react";

import { toneText, type Tone } from "@/components/system";
import { cn } from "@/lib/utils";

interface CardProps {
  title: string;
  note?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, note, actions, children, className }: CardProps) {
  return (
    <section aria-label={title} className={cn("min-w-0 overflow-hidden rounded-[10px] border border-line bg-surface", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3">
        <h2 className="text-meta font-medium text-muted">{title}</h2>
        {note && <span className="text-caption text-muted">{note}</span>}
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function stateText(tone: Tone): string {
  return tone === "warn" || tone === "err" ? toneText[tone] : "text-ink";
}

interface TileProps {
  label: string;
  value: string;
  note: string;
  tone?: Tone;
}

export function Tile({ label, value, note, tone = "neutral" }: TileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[10px] border border-line bg-surface px-4 py-3">
      <span className="text-caption text-muted">{label}</span>
      <span className={cn("font-mono text-[22px] leading-7 font-medium tabular-nums", stateText(tone))}>{value}</span>
      <span className="text-caption text-ink-2">{note}</span>
    </div>
  );
}

interface TabsProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

export function Tabs<T extends string>({ options, value, onChange, label }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-0.5 overflow-x-auto border-b border-line [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className="-mb-px shrink-0 border-b-2 border-transparent px-3 py-2 text-meta whitespace-nowrap text-ink-2 transition-colors hover:text-ink aria-selected:border-primary aria-selected:text-ink"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
