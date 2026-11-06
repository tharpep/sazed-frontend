import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { toneDot, type Tone } from "./tone";

interface StatusPillProps {
  tone?: Tone;
  pulse?: boolean;
  children: ReactNode;
}

export function StatusPill({ tone = "neutral", pulse = false, children }: StatusPillProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-caption text-ink-2"
      role="status"
    >
      <span className={cn("size-1.5 rounded-full", toneDot[tone], pulse && "animate-pulse")} aria-hidden="true" />
      {children}
    </span>
  );
}
