import { cn } from "@/lib/utils";

import { STEP_LETTER, stepParts, type StepKind } from "./steps";

const TONE: Record<StepKind, string> = {
  edit: "bg-ok",
  read: "bg-warn",
  run: "bg-primary",
  search: "bg-muted",
  web: "bg-ink-2",
  other: "bg-muted",
};

export function StepIcon({ kind }: { kind: StepKind }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-[4px] font-sans text-[9px] font-semibold text-bg",
        TONE[kind]
      )}
    >
      {STEP_LETTER[kind]}
    </span>
  );
}

export function StepLine({ step, className }: { step: string; className?: string }) {
  const { kind, tool, detail } = stepParts(step);
  return (
    <div className={cn("flex min-w-0 items-center gap-1.5 font-mono text-caption text-muted", className)} title={step}>
      <StepIcon kind={kind} />
      <span className="sr-only">{tool}</span>
      <span className="truncate">{detail}</span>
    </div>
  );
}
