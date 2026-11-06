import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { toneDot, type Tone } from "./tone";

interface ChipProps {
  label: string;
  value: ReactNode;
  /** Adds a state dot. Leave unset for figures that carry no state. */
  tone?: Tone;
  onClick?: () => void;
}

/** One figure in a row of status chips (Home's summary): label, then the value in monospace. */
export function Chip({ label, value, tone, onClick }: ChipProps) {
  const body = (
    <>
      {tone && <span className={cn("size-1.5 rounded-full", toneDot[tone])} aria-hidden="true" />}
      <span className="text-muted">{label}</span>
      <span className="font-mono text-caption text-ink tabular-nums">{value}</span>
    </>
  );
  const className = "inline-flex flex-none items-center gap-1.5 rounded-full bg-raised px-3 py-1.5 text-meta";
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(className, "transition-colors hover:bg-line")}>
      {body}
    </button>
  ) : (
    <span className={className}>{body}</span>
  );
}
