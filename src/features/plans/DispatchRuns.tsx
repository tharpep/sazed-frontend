import { useEffect, useState } from "react";

import { listDispatchPlans, type DispatchPlanSummary } from "@/api/dispatch";
import { errorText } from "@/api/homelab";
import type { RunState } from "@/api/jobs";
import { EmptyState, ListRow, ListSection } from "@/components/system";
import { STATUS_LABEL } from "@/features/jobs/format";
import { outcomeOf } from "./dispatchRun";
import { ago } from "./planParts";

const ORDER: RunState[] = [
  "running",
  "needs_input",
  "needs_approval",
  "queued",
  "paused",
  "failed",
  "timed_out",
  "skipped",
  "cancelled",
  "succeeded",
];

const KNOWN = new Set<string>([...ORDER, "planned"]);

/** Run-state counts in job words; a state from a newer backend shows as its raw word. */
export function counts(states: Record<string, number>) {
  const words = ORDER.filter((s) => states[s]).map((s) => `${states[s]} ${STATUS_LABEL[s].toLowerCase()}`);
  for (const [s, n] of Object.entries(states)) if (n && !KNOWN.has(s)) words.push(`${n} ${s}`);
  if (states.planned) words.push(`${states.planned} not started`);
  return words.join(" · ");
}

export function DispatchRuns({ onOpen }: { onOpen: (plan: string) => void }) {
  const [plans, setPlans] = useState<DispatchPlanSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listDispatchPlans()
      .then((p) => live && (setPlans(p), setError(null)))
      .catch((err) => live && setError(errorText(err)));
    return () => {
      live = false;
    };
  }, []);

  if (error) return <p className="text-meta text-err">Couldn't load dispatch runs: {error}</p>;
  if (!plans) return <p className="text-meta text-muted">Loading…</p>;
  if (plans.length === 0)
    return <EmptyState title="No dispatch runs">Runs show up here once dispatch posts its first task row.</EmptyState>;
  const groups = (["Running", "Failed", "Done"] as const).map((outcome) => [
    outcome,
    plans.filter((plan) => outcomeOf(plan) === outcome),
  ] as const);

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([label, items]) =>
        items.length > 0 ? (
          <section key={label} aria-label={label} className="flex flex-col gap-2">
            <h3 className="px-1 text-sm font-medium text-ink">{label}</h3>
            <ListSection>
              {items.map((p) => {
                const landed = p.phases.landed ?? 0;
                return (
                  <ListRow
                    key={p.plan}
                    onClick={() => onOpen(p.plan)}
                    title={<span className="font-mono">{p.plan}</span>}
                    description={`${p.repo} · ${p.host}`}
                    detail={
                      <>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span aria-hidden="true" className="h-1 w-24 overflow-hidden rounded-full bg-raised">
                            <span
                              className="block h-full bg-ok"
                              style={{ width: `${p.tasks_total ? (100 * landed) / p.tasks_total : 0}%` }}
                            />
                          </span>
                          <span className="font-mono text-caption">
                            {landed}/{p.tasks_total} landed
                          </span>
                        </span>
                        <span className="mt-0.5 block text-caption text-muted">{counts(p.states)}</span>
                      </>
                    }
                    meta={<span>{ago(p.updated_at)}</span>}
                  />
                );
              })}
            </ListSection>
          </section>
        ) : null
      )}
    </div>
  );
}
