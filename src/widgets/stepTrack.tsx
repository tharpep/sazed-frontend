import type { ProjectCard, Workstream, WorkstreamStatus } from "@/api/projects";
import { cn } from "@/lib/utils";

import { cardGroup, GROUP_ORDER, liveSteps, trackText, type CardGroup } from "./projectWork";

// Tailwind arbitrary values, so the hatch needs nothing in globals.css.
const HATCH = "bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--color-err)_24%,transparent)_0_4px,transparent_4px_8px)]";
const HATCH_THIN = "bg-[repeating-linear-gradient(135deg,var(--color-err)_0_2px,transparent_2px_5px)]";
const CURRENT = "outline-[1.5px] outline-offset-1 outline-ink";

const SQUARE: Record<WorkstreamStatus, string> = {
  done: "border-ok/40 bg-ok/20 text-ok",
  in_flight: "border-[1.5px] border-primary bg-surface text-primary",
  needs_me: "border-[1.5px] border-warn bg-warn/10 text-warn",
  next: "border-ink-2/50 bg-surface text-ink-2",
  planned: "border-line bg-surface text-muted",
  blocked: cn("border-err/40 text-err", HATCH),
  dropped: "border-dashed border-line text-muted opacity-50",
};

const SEGMENT: Record<WorkstreamStatus, string> = {
  done: "bg-ok",
  in_flight: "bg-primary/25",
  needs_me: "bg-warn",
  next: "bg-muted/55",
  planned: "bg-line",
  blocked: cn("opacity-70", HATCH_THIN),
  dropped: "hidden",
};

const LEGEND_WORD: Record<WorkstreamStatus, string> = {
  done: "done",
  in_flight: "in flight",
  needs_me: "waiting on you",
  next: "next",
  planned: "planned",
  blocked: "blocked",
  dropped: "dropped",
};

const LEGEND_ORDER: readonly WorkstreamStatus[] = ["done", "in_flight", "needs_me", "next", "planned", "blocked"];

function doneShare(step: Workstream): number {
  return step.progress.total ? step.progress.done / step.progress.total : 0;
}

/** One step's numbered square, as the track draws it; a dropped step has no number. */
export function StepSquare({
  step,
  number,
  current = false,
  className,
}: {
  step: Workstream;
  number: number | undefined;
  current?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      title={step.title}
      className={cn(
        "relative grid min-w-0 place-items-center overflow-hidden rounded-md border font-mono text-[11px] leading-none",
        SQUARE[step.status],
        current && CURRENT,
        className
      )}
    >
      {step.status === "in_flight" && (
        <i className="absolute inset-x-0 bottom-0 bg-primary/15" style={{ height: `${doneShare(step) * 100}%` }} />
      )}
      {step.status === "needs_me" && <i className="absolute top-[3px] right-[3px] size-1.5 rounded-full border-[1.5px] border-warn" />}
      {number !== undefined && <span className="relative">{number}</span>}
    </span>
  );
}

/** One numbered square per live step: a picture, not a control. Squares shrink to fit a phone and
 * hold a fixed size from 640px, so a short track never stretches into pills. */
export function StepTrack({ steps, currentId }: { steps: Workstream[]; currentId: string | null }) {
  const live = liveSteps(steps);
  const present = LEGEND_ORDER.filter((s) => live.some((w) => w.status === s));
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="img"
        aria-label={trackText(steps, currentId)}
        className="mx-0.5 grid auto-cols-fr grid-flow-col gap-1 sm:flex sm:flex-wrap"
      >
        {live.map((w, i) => (
          <StepSquare key={w.id} step={w} number={i + 1} current={w.id === currentId} className="h-[30px] sm:w-[30px]" />
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-wrap gap-x-3 gap-y-1 px-0.5 text-caption text-muted">
        {present.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <i className={cn("inline-block h-2 w-3 rounded-[2px] border", SQUARE[s])} />
            {LEGEND_WORD[s]}
          </span>
        ))}
        {currentId && (
          <span className="inline-flex items-center gap-1.5">
            <i className={cn("inline-block h-2 w-3 rounded-[2px] border border-line", CURRENT)} />
            current
          </span>
        )}
      </div>
    </div>
  );
}

/** Home's one-line track: a segment per live step, the current one outlined. */
export function MiniTrack({ steps, currentId }: { steps: Workstream[]; currentId: string | null }) {
  return (
    <span role="img" aria-label={trackText(steps, currentId)} className="my-1 grid auto-cols-fr grid-flow-col gap-[3px] px-0.5">
      {liveSteps(steps).map((w) => (
        <i
          key={w.id}
          aria-hidden="true"
          className={cn("relative block h-1.5 min-w-0 overflow-hidden rounded-[3px]", SEGMENT[w.status], w.id === currentId && CURRENT)}
        >
          {w.status === "in_flight" && (
            <i className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${doneShare(w) * 100}%` }} />
          )}
        </i>
      ))}
    </span>
  );
}

const CARD_SQUARE: Record<CardGroup, string> = {
  waiting: "border-warn bg-warn/25",
  flight: "border-primary",
  todo: "border-muted/50",
  done: "border-ok bg-ok",
};

const KEY: Record<CardGroup, string> = {
  waiting: "Diamond: waits on you.",
  flight: "Dot: in flight.",
  todo: "Outline: not started.",
  done: "Filled: done.",
};

/** One small mark per card, hidden from screen readers: the count line above says the same. */
export function CardSquares({ cards }: { cards: ProjectCard[] }) {
  const ordered = GROUP_ORDER.flatMap((g) => cards.filter((c) => cardGroup(c) === g));
  const present = GROUP_ORDER.filter((g) => cards.some((c) => cardGroup(c) === g));
  return (
    <div aria-hidden="true" className="flex flex-col gap-1.5">
      <div data-squares className="flex flex-wrap gap-1">
        {ordered.map((c) => {
          const g = cardGroup(c);
          return (
            <i key={c.id} title={c.title} className={cn("grid size-4 place-items-center rounded-[4px] border-[1.5px]", CARD_SQUARE[g])}>
              {g === "flight" && <i className="block size-1.5 rounded-full bg-primary" />}
              {g === "waiting" && <i className="block size-[7px] rotate-45 rounded-[1px] bg-warn" />}
            </i>
          );
        })}
      </div>
      <p className="text-caption text-muted">{present.map((g) => KEY[g]).join(" ")}</p>
    </div>
  );
}
