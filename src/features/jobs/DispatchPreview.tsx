import type { ReactNode } from "react";

import type { JobDetail } from "@/api/jobs";
import { cn } from "@/lib/utils";
import { dollars } from "@/features/plans/dispatchRun";
import { STATUS_LABEL } from "./format";

export interface PreviewTask {
  id: string;
  goal: string | null;
  profile: string | null;
  owns: string[];
  depends_on: string[];
  cap: number | null;
  state: string | null;
}

export interface DispatchPreviewData {
  repo: string | null;
  base: string | null;
  title: string | null;
  tasks: PreviewTask[];
  budget: number | null;
  capsTotal: number | null;
  timeout_s: number | null;
  parallel: number | null;
  hash: string | null;
  spent: number | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function readDispatchJob(job: Pick<JobDetail, "params" | "meta">): DispatchPreviewData {
  const params = isRecord(job.params) ? job.params : {};
  const meta: Record<string, unknown> = isRecord(job.meta) ? job.meta : {};
  const caps = isRecord(params.task_caps) ? params.task_caps : {};
  const states = isRecord(meta.tasks) ? meta.tasks : {};
  const plan = isRecord(params.plan) ? params.plan : {};
  const capValues = Object.values(caps).map(num).filter((n): n is number => n !== null);
  const tasks = (Array.isArray(plan.tasks) ? plan.tasks : []).filter(isRecord).map((t, i) => {
    const id = str(t.id) ?? `task ${i + 1}`;
    return {
      id,
      goal: str(t.goal),
      profile: str(t.profile),
      owns: strList(t.owns),
      depends_on: strList(t.depends_on),
      cap: num(caps[id]),
      state: str(states[id]),
    };
  });
  return {
    repo: str(params.repo),
    base: str(params.base),
    title: str(params.title),
    tasks,
    budget: num(params.budget_usd),
    capsTotal: capValues.length ? capValues.reduce((a, b) => a + b, 0) : null,
    timeout_s: num(params.timeout_s),
    parallel: num(params.parallel),
    hash: str(params.plan_hash)?.slice(0, 12) ?? null,
    spent: num(meta.cost_usd),
  };
}

export function hoursMinutes(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const mins = Math.round(secs / 60);
  return [mins >= 60 && `${Math.floor(mins / 60)}h`, mins % 60 && `${mins % 60}m`].filter(Boolean).join(" ");
}

export function DispatchPreview({ job }: { job: Pick<JobDetail, "params" | "meta"> }) {
  const d = readDispatchJob(job);
  const overBudget = d.budget !== null && d.capsTotal !== null && d.capsTotal > d.budget;
  const facts: Array<[string, ReactNode]> = [];
  if (d.repo) facts.push(["Repo", <span className="font-mono">{d.repo}{d.base && ` onto ${d.base}`}</span>]);
  if (d.title) facts.push(["PR title", d.title]);
  if (d.budget !== null || d.capsTotal !== null)
    facts.push([
      "Budget",
      <span className={cn(overBudget && "text-destructive")}>
        {d.budget !== null ? dollars(d.budget) : "not set"} · task caps {d.capsTotal !== null ? dollars(d.capsTotal) : "not set"}
        {d.spent !== null && ` · ${dollars(d.spent)} spent`}
      </span>,
    ]);
  if (d.timeout_s !== null) facts.push(["Wall clock", hoursMinutes(d.timeout_s)]);
  if (d.parallel !== null) facts.push(["Parallel", d.parallel === 1 ? "one task at a time" : `${d.parallel} tasks at a time`]);
  if (d.hash) facts.push(["Plan hash", <span className="font-mono">{d.hash}</span>]);

  return (
    <section aria-label="Dispatch plan" className="flex flex-col gap-3 rounded-md border border-border px-3 py-2.5">
      <h3 className="text-sm font-medium text-ink">Dispatch plan</h3>
      {facts.length > 0 && (
        <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-xs">
          {facts.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd className="min-w-0 [overflow-wrap:anywhere] text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {d.tasks.length === 0 ? (
        <p className="text-xs text-muted">The job carries no tasks.</p>
      ) : (
        <ol aria-label="Tasks" className="flex flex-col divide-y divide-border border-t border-border">
          {d.tasks.map((t) => (
            <li key={t.id} className="flex flex-col gap-0.5 py-2 text-xs">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono font-medium [overflow-wrap:anywhere] text-ink">{t.id}</span>
                {t.profile && <span className="text-muted">{t.profile}</span>}
                <span className="ml-auto text-muted">
                  {t.state && `${STATUS_LABEL[t.state as keyof typeof STATUS_LABEL] ?? t.state} · `}
                  {t.cap !== null ? `cap ${dollars(t.cap)}` : "no cap"}
                </span>
              </div>
              {t.goal && <p className="text-ink">{t.goal}</p>}
              <p className="text-muted">
                Owns <span className="font-mono [overflow-wrap:anywhere]">{t.owns.join(", ") || "nothing"}</span>
                {" · "}after {t.depends_on.join(", ") || "nothing"}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
