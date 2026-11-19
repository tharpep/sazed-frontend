import type { DispatchPhase, DispatchPlanSummary, DispatchRow, DispatchStep, DispatchTask } from "@/api/dispatch";
import type { RunState } from "@/api/jobs";
import type { Tone } from "@/components/system";
import { STATUS_LABEL, runTone } from "@/features/jobs/format";

export type RunOutcome = "Running" | "Failed" | "Done";

const FAILED: RunState[] = ["failed", "timed_out", "paused", "skipped"];
const DONE: RunState[] = ["succeeded", "cancelled"];

/** The same groups as the jobs list; a plan is Done only once every task has finished. */
export function outcomeOf(plan: DispatchPlanSummary): RunOutcome {
  const count = (names: RunState[]) => names.reduce((sum, s) => sum + (plan.states[s] ?? 0), 0);
  if (count(["queued", "needs_approval", "running", "needs_input"]) > 0) return "Running";
  if (count(FAILED) > 0) return "Failed";
  return count(DONE) >= plan.tasks_total ? "Done" : "Running";
}

export type Column = "landed" | "working" | "landing" | "next";
/** The card's word: the phase, except where only the run state tells what happened. */
export type TaskState = DispatchPhase | "cancelled" | "next";

const COLUMN: Partial<Record<TaskState, Column>> = {
  landed: "landed",
  running: "working",
  waiting: "working",
  failed: "working",
  conflict: "working",
  blocked: "working",
  timed_out: "working",
  cancelled: "working",
  done: "landing",
};

export const STATE_TONE: Record<TaskState, Tone> = {
  running: "accent",
  done: "ok",
  landed: "ok",
  waiting: "warn",
  failed: "err",
  conflict: "err",
  blocked: "err",
  cleaned: "neutral",
  timed_out: runTone("timed_out"),
  cancelled: runTone("cancelled"),
  next: "neutral",
};

export function stateWord(state: TaskState): string {
  if (state === "timed_out" || state === "cancelled") return STATUS_LABEL[state].toLowerCase();
  if (state === "waiting") return "asking you";
  if (state === "next") return "not started";
  return state;
}

export const last = <T,>(xs: T[]): T | undefined => xs[xs.length - 1];

export const at = (row: DispatchRow) => Date.parse(row.received_at);

export function runRows(task: DispatchTask): DispatchRow[] {
  const cleaned = task.rows.map((r) => r.phase).lastIndexOf("cleaned");
  return task.rows.slice(cleaned + 1);
}

// A reaped task's phase stays failed and a task cleaned mid-run leaves no current rows, so
// those two read from Sazed's run state.
export function stateOf(task: DispatchTask): TaskState {
  const latest = last(runRows(task));
  if (latest) return latest.state === "timed_out" ? "timed_out" : latest.phase;
  return last(task.rows)?.state === "cancelled" ? "cancelled" : "next";
}

export const columnOf = (task: DispatchTask): Column => COLUMN[stateOf(task)] ?? "next";

export const costOf = (task: DispatchTask) => runRows(task).reduce((sum, r) => sum + (r.cost_usd ?? 0), 0);

export const tries = (task: DispatchTask) => runRows(task).filter((r) => r.phase === "running").length;

export function isSettled(tasks: DispatchTask[]): boolean {
  return tasks.every((t) => stateOf(t) === "landed");
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
}

export const dollars = (n: number) => `$${n.toFixed(2)}`;

export const stepLine = (s: DispatchStep): string => (s.tool ? `${s.tool}: ${s.text}` : s.text);

export const toolSteps = (task: DispatchTask): DispatchStep[] => (task.steps ?? []).filter((s) => s.kind === "tool");
