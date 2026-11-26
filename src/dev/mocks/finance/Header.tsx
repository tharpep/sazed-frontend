import { Eye, EyeOff, Plus } from "lucide-react";

import { Segmented } from "@/components/system";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATE_NAMES, type Due, type FinanceState, type StateName } from "./data";
import { useMask } from "./Masked";
import { inDays } from "./parts";
import { useOpenSheet } from "./sheets/openSheet";

const STATE_LABELS: Record<StateName, string> = { day1: "Day 1", month3: "Month 3", stale: "Stale" };

export function Toolbar({ state, onState }: { state: StateName; onState: (next: StateName) => void }) {
  const { masked, toggle } = useMask();
  const openSheet = useOpenSheet();
  return (
    <div className="flex items-center gap-2">
      <Segmented
        label="Data state"
        value={state}
        onChange={onState}
        options={STATE_NAMES.map((value) => ({ value, label: STATE_LABELS[value] }))}
      />
      <div className="ml-auto flex items-center gap-1 md:gap-2">
        <Button
          variant="ghost"
          aria-label={masked ? "Show amounts" : "Hide amounts"}
          aria-pressed={!masked}
          onClick={toggle}
          className="size-11 text-meta md:h-8 md:w-auto md:border-line md:bg-surface md:text-ink"
        >
          {masked ? <EyeOff className="size-5 md:size-4" /> : <Eye className="size-5 md:size-4" />}
          <span className="hidden md:inline">{masked ? "Show amounts" : "Hide amounts"}</span>
        </Button>
        <Button
          variant="ghost"
          aria-label="Share a screenshot"
          onClick={() => openSheet({ kind: "capture" })}
          className="size-11 text-meta md:h-8 md:w-auto md:border-line md:bg-surface md:text-ink"
        >
          <Plus className="size-5 md:size-4" />
          <span className="hidden md:inline">Share a screenshot</span>
        </Button>
        <Button
          variant="outline"
          className="hidden text-meta md:inline-flex"
          onClick={() => openSheet({ kind: "manual" })}
        >
          Type a figure
        </Button>
      </div>
    </div>
  );
}

export function StaleNote({ note }: { note: NonNullable<FinanceState["staleNote"]> }) {
  return (
    <p className="rounded-lg border border-dashed border-warn px-3 py-2.5 text-meta text-ink-2">
      <b className="font-medium text-warn">{note.lead}</b> {note.body}
    </p>
  );
}

export function Chips({ toCheck, next, className }: { toCheck: number; next?: Due; className?: string }) {
  const chip = "h-8 shrink-0 bg-raised px-2.5 text-meta font-normal";
  const openSheet = useOpenSheet();
  return (
    <div className={cn("gap-1.5", className)}>
      {toCheck > 0 && (
        <Button
          variant="ghost"
          className={cn(chip, "text-warn hover:text-warn")}
          onClick={() => openSheet({ kind: "review" })}
        >
          {toCheck} to check
        </Button>
      )}
      {next && (
        <Button
          variant="ghost"
          className={cn(chip, "text-ink-2")}
          onClick={() => openSheet({ kind: "bill", id: next.id })}
        >
          {next.name.replace(" card", "")} {inDays(next.inDays)}
        </Button>
      )}
    </div>
  );
}
