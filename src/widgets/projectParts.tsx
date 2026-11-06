import { cn } from "@/lib/utils";
import type { BoardProgress, WorkstreamStatus } from "@/api/projects";

export const STATUS_LABEL: Record<WorkstreamStatus, string> = {
  done: "done",
  in_flight: "in flight",
  needs_me: "needs you",
  next: "next",
  blocked: "blocked",
  planned: "planned",
  dropped: "dropped",
};

export const STATUS_TEXT: Record<WorkstreamStatus, string> = {
  done: "text-ok",
  in_flight: "text-primary",
  needs_me: "text-warn",
  next: "text-ink-2",
  blocked: "text-err",
  planned: "text-muted",
  dropped: "text-muted",
};

const SEGMENTS = [
  ["done", "bg-ok"],
  ["in_flight", "bg-primary"],
  ["needs_me", "bg-warn"],
  ["next", "bg-muted/55"],
] as const;

/** Split bar: done, in flight, needs you, next. Ideas are not on it. */
export function ProgressBar({ progress, className }: { progress: BoardProgress; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`${progress.done} of ${progress.total} done`}
      className={cn("flex h-1.5 min-w-24 overflow-hidden rounded-[3px] bg-raised", className)}
    >
      {progress.total > 0 &&
        SEGMENTS.map(([key, color]) =>
          progress[key] > 0 ? (
            <i key={key} className={cn("block h-full", color)} style={{ width: `${(progress[key] / progress.total) * 100}%` }} />
          ) : null
        )}
    </div>
  );
}

const LEGEND = [
  ["Done", "bg-ok"],
  ["In flight", "bg-primary"],
  ["Needs you", "bg-warn"],
  ["Next", "bg-muted/55"],
] as const;

export function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted">
      {LEGEND.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <i className={cn("inline-block h-1.5 w-2.5 rounded-xs", color)} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}
