import { useEffect, useState } from "react";

import { listDispatchPlans, type DispatchPlanSummary } from "@/api/dispatch";
import { errorText } from "@/api/homelab";
import { EmptyState, ListRow, ListSection } from "@/components/system";
import { ago } from "./planParts";

const ORDER = ["running", "waiting", "failed", "conflict", "blocked", "done", "landed", "cleaned"];

export function counts(states: Record<string, number>) {
  return ORDER.filter((s) => states[s]).map((s) => `${states[s]} ${s}`).join(" · ");
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
  const groups = [
    ["Running", plans.filter((p) => (p.states.running ?? 0) + (p.states.waiting ?? 0) > 0)],
    ["Failed", plans.filter((p) => ["failed", "conflict", "blocked"].some((state) => (p.states[state] ?? 0) > 0))],
    ["Done", plans.filter((p) => ["done", "landed", "cleaned"].some((state) => (p.states[state] ?? 0) > 0))],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([label, items]) =>
        items.length > 0 ? (
          <section key={label} aria-label={label} className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-medium text-ink">{label}</h2>
            <ListSection>
              {items.map((p) => {
                const landed = p.states.landed ?? 0;
                return (
                  <ListRow
                    key={p.plan}
                    onClick={() => onOpen(p.plan)}
                    title={<span className="font-mono">{p.plan}</span>}
                    description={
                      <>
                        {p.repo} · {p.host}
                        <span className="mt-1 flex items-center gap-2">
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
                      </>
                    }
                    meta={
                      <>
                        <span>{ago(p.updated_at)}</span>
                        <span>{counts(p.states)}</span>
                      </>
                    }
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
