import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

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
  ok: "border-transparent bg-card-ok-tint text-card-ok-on-tint",
  warn: "border-transparent bg-card-warn-tint text-card-warn-on-tint",
  err: "border-transparent bg-card-err-tint text-card-err-on-tint",
  info: "border-transparent bg-card-info-tint text-card-info-on-tint",
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

/** A 14px state square, named on hover and to assistive tech. */
export function Square({ tone, title }: { tone: Tone; title: string }) {
  return <span role="img" title={title} aria-label={title} className={cn("inline-block size-3.5 flex-none rounded-[3px]", TONE_FILL[tone])} />;
}

export type StepMark = "done" | "landing" | "flight" | "asking" | "blocked" | "planned" | "other";

const STEP_MARK_CLASS: Record<StepMark, string> = {
  done: "border border-transparent bg-card-ok-tint text-card-ok-on-tint",
  landing: "border-[1.5px] border-dashed border-card-ok-fill text-card-ok",
  flight: "border-[1.5px] border-card-info-fill text-card-info",
  asking: "border-[1.5px] border-card-warn-fill bg-card-warn-tint text-card-warn-on-tint",
  blocked:
    "border border-transparent bg-[repeating-linear-gradient(135deg,var(--color-card-err-tint)_0_4px,transparent_4px_8px)] text-card-err",
  planned: "border border-card-line text-card-ink-3",
  other: "border border-card-line-2 text-card-ink-2",
};

/** A 26px numbered square for one step; shape carries the state as well as colour. */
export function StepSquare({ mark, label, title }: { mark: StepMark; label: string; title: string }) {
  return (
    <span
      role="img"
      title={title}
      aria-label={title}
      className={cn("inline-grid size-[26px] flex-none place-items-center rounded-md font-mono text-caption tabular-nums", STEP_MARK_CLASS[mark])}
    >
      {label}
    </span>
  );
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

/** The one thing that needs him, clamped to six lines with a toggle; onClampedChange says when the clamp hides text. */
export function Callout({ children, sub, onClampedChange }: { children: ReactNode; sub?: ReactNode; onClampedChange?: (clamped: boolean) => void }) {
  const text = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [clipped, setClipped] = useState(false);

  useLayoutEffect(() => {
    const el = text.current;
    if (!el || open) return;
    const measure = () => setClipped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, children]);

  useLayoutEffect(() => onClampedChange?.(clipped && !open), [clipped, open, onClampedChange]);

  // The toggle moves between the bottom (collapsed) and the top (expanded), so focus follows it.
  const toggled = useRef(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (toggled.current) button.current?.focus();
  }, [open]);

  const toggle = (clipped || open) && (
    <button
      ref={button}
      type="button"
      aria-expanded={open}
      onClick={() => {
        toggled.current = true;
        setOpen(!open);
      }}
      className="relative ml-auto flex-none cursor-pointer rounded border-0 bg-transparent p-0 text-[12px] font-medium text-card-warn underline underline-offset-2 after:absolute after:-inset-x-1 after:-inset-y-3.5 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-card-info-fill"
    >
      {open ? "Show less" : "Show full question"}
    </button>
  );

  return (
    <div className="mb-2 rounded-lg bg-card-warn-tint px-2.5 py-2">
      {open && <div className="mb-1 flex">{toggle}</div>}
      <div ref={text} className={cn("font-medium whitespace-pre-wrap [overflow-wrap:anywhere] text-card-warn", !open && "line-clamp-6")}>
        {children}
      </div>
      <div className="flex items-baseline gap-x-3 text-[12px]">
        {sub && <span className="line-clamp-2 min-w-0 flex-1 [overflow-wrap:anywhere] text-card-ink-2">{sub}</span>}
        {!open && toggle}
      </div>
    </div>
  );
}

export interface CardLink {
  label: string;
  href: string;
  /** Whether the href passed its allow-list (card/links.ts); a link that fails is plain text. */
  safe: boolean;
}

/** At most two link buttons at the bottom of a card, each a 44px target. */
export function CardActions({ links }: { links: CardLink[] }) {
  if (!links.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {links.slice(0, 2).map((link) =>
        link.safe ? (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-card-line-2 px-3.5 text-[14px] font-medium text-card-ink no-underline hover:bg-card-track focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-card-info-fill"
          >
            {link.label}
          </a>
        ) : (
          <span key={link.label} className="text-[12px] text-card-ink-3">
            {link.label} (link not shown)
          </span>
        )
      )}
    </div>
  );
}
