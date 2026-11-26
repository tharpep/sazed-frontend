import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Tone = "ok" | "warn" | "err" | "info";

export const TONE_TEXT: Record<Tone, string> = {
  ok: "text-card-ok",
  warn: "text-card-warn",
  err: "text-card-err",
  info: "text-card-info",
};

const TONE_FILL: Record<Tone, string> = {
  ok: "bg-card-ok-fill",
  warn: "bg-card-warn-fill",
  err: "bg-card-err-fill",
  info: "bg-card-info-fill",
};

const TONE_PILL: Record<Tone, string> = {
  ok: "border-transparent bg-card-ok-tint text-card-ok",
  warn: "border-transparent bg-card-warn-tint text-card-warn",
  err: "border-transparent bg-card-err-tint text-card-err",
  info: "border-transparent bg-card-info-tint text-card-info",
};

/** A short state word; with no tone it is outlined. */
export function Pill({ tone, children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full border px-[7px] py-px text-[11.5px] whitespace-nowrap",
        tone ? TONE_PILL[tone] : "border-card-line-2 text-card-ink-2"
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ tone }: { tone: Tone }) {
  return <span aria-hidden="true" className={cn("inline-block size-2 flex-none rounded-full", TONE_FILL[tone])} />;
}

/** A 14px state square, named on hover. */
export function Square({ tone, title }: { tone: Tone; title: string }) {
  return <span title={title} aria-label={title} className={cn("inline-block size-3.5 flex-none rounded-[3px]", TONE_FILL[tone])} />;
}

/** A row of squares that wraps. */
export function Squares({ children }: { children: ReactNode }) {
  return <span className="flex flex-wrap gap-[3px]">{children}</span>;
}

/** One track with segments; each share is 0 to 1 of the track. */
export function StackedMeter({ parts }: { parts: { share: number; tone: Tone }[] }) {
  return (
    <div className="flex h-1.5 overflow-hidden rounded-[3px] bg-card-track">
      {parts.map((part, i) => (
        <i
          key={i}
          className={cn("block h-full", TONE_FILL[part.tone], i > 0 && "border-l-[1.5px] border-card-bg")}
          style={{ width: `${Math.max(0, Math.min(1, part.share)) * 100}%` }}
        />
      ))}
    </div>
  );
}

/** The one thing that needs him, in a tinted block; the text is never cut. */
export function Callout({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-2 rounded-lg bg-card-warn-tint px-2.5 py-2">
      <div className="font-medium whitespace-pre-wrap [overflow-wrap:anywhere] text-card-warn">{children}</div>
      {sub && <div className="text-[12px] [overflow-wrap:anywhere] text-card-ink-3">{sub}</div>}
    </div>
  );
}

/** At most two link buttons at the bottom of a card, each a 44px target. */
export function CardActions({ links }: { links: { label: string; href: string }[] }) {
  if (!links.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {links.slice(0, 2).map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-card-line-2 px-3.5 text-[14px] font-medium text-card-ink no-underline"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
