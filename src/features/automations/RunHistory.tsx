import { useState } from "react";

import { cn } from "@/lib/utils";
import type { AutomationRun } from "@/api/automations";
import { RUN_LABEL, runTone, shortWhen } from "./format";

interface Props {
  runs: AutomationRun[];
  timezone: string;
  onOpenSession: (sessionId: string) => void;
}

export function RunHistory({ runs, timezone, onOpenSession }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (runs.length === 0) return <p className="text-sm text-muted">Hasn't run yet.</p>;

  return (
    <ul className="flex flex-col divide-y divide-border">
      {runs.map((r) => {
        const text = r.output ?? r.error ?? "";
        const isOpen = expanded === r.id;
        return (
          <li key={r.id} className="flex flex-col gap-1 py-2">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn(runTone(r.status), r.status === "success" && "text-ink")}>
                {RUN_LABEL[r.status]}
                <span className="text-muted">
                  {r.triggered_by === "manual" && " · run manually"}
                  {r.delivered.length > 0 && ` · sent to ${r.delivered.join(", ")}`}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted">{shortWhen(r.started_at, timezone)}</span>
            </div>
            {text && (
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className={cn(
                  "whitespace-pre-wrap text-left text-xs text-muted",
                  !isOpen && "line-clamp-3"
                )}
              >
                {text}
              </button>
            )}
            {r.session_id && (
              <button
                type="button"
                onClick={() => onOpenSession(r.session_id!)}
                className="self-start text-xs text-primary hover:underline"
              >
                {r.status === "needs_approval" ? "Open session to approve" : "Open session"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
