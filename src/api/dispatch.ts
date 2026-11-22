import { apiFetch } from "./client";
import type { RunState } from "./jobs";

/** The integration word dispatch wrote; Sazed maps it to a run state in one place. */
export type DispatchPhase =
  | "running"
  | "done"
  | "waiting"
  | "failed"
  | "landed"
  | "conflict"
  | "blocked"
  | "cleaned"
  | "timed_out";

export interface DispatchRow {
  plan: string;
  task: string;
  ts: number;
  state: RunState;
  phase: DispatchPhase;
  line: string;
  ref: string | null;
  cost_usd: number | null;
  session: string | null;
  meta: unknown;
  received_at: string;
}

export interface DispatchPlanSummary {
  plan: string;
  repo: string;
  base: string;
  host: string;
  updated_at: string;
  tasks_total: number;
  /** Tasks per run state, and per phase; a task with no rows yet counts as planned in both. */
  states: Record<string, number>;
  phases: Record<string, number>;
  project?: string | null;
  board_plan?: string | null;
}

export interface DispatchStep {
  ts: number;
  seq: number;
  kind: "tool" | "result" | "text";
  tool: string | null;
  text: string;
  error: boolean;
  received_at: string;
}

export interface DispatchTask {
  id: string;
  goal: string;
  owns: string[];
  depends_on: string[];
  profile: string;
  model: string;
  latest: DispatchRow | null;
  rows: DispatchRow[];
  steps?: DispatchStep[];
  tools?: number;
}

export interface DispatchPlan extends DispatchPlanSummary {
  now?: string;
  job_id?: string | null;
  pr_url?: string | null;
  pr_number?: number | null;
  pr_head_sha?: string | null;
  exported_at?: string | null;
  tasks: DispatchTask[];
}

export function listDispatchPlans(): Promise<DispatchPlanSummary[]> {
  return apiFetch("/dispatch/plans") as Promise<DispatchPlanSummary[]>;
}

export function getDispatchPlan(plan: string): Promise<DispatchPlan> {
  return apiFetch(`/dispatch/plans/${encodeURIComponent(plan)}`) as Promise<DispatchPlan>;
}
