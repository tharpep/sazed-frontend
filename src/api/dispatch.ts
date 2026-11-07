import { apiFetch } from "./client";

export type DispatchState =
  | "running"
  | "done"
  | "waiting"
  | "failed"
  | "landed"
  | "conflict"
  | "blocked"
  | "cleaned";

export interface DispatchRow {
  plan: string;
  task: string;
  ts: number;
  state: DispatchState;
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
  states: Record<string, number>;
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
}

export interface DispatchPlan extends DispatchPlanSummary {
  now?: string;
  tasks: DispatchTask[];
}

export function listDispatchPlans(): Promise<DispatchPlanSummary[]> {
  return apiFetch("/dispatch/plans") as Promise<DispatchPlanSummary[]>;
}

export function getDispatchPlan(plan: string): Promise<DispatchPlan> {
  return apiFetch(`/dispatch/plans/${encodeURIComponent(plan)}`) as Promise<DispatchPlan>;
}
