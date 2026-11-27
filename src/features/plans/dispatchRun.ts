import type { DispatchPhase, DispatchPlanSummary, DispatchRow, DispatchStep, DispatchTask } from "@/api/dispatch";
import type { RunState } from "@/api/jobs";
import type { Tone } from "@/components/system";
import { STATUS_LABEL, runTone } from "@/features/jobs/format";

export type RunOutcome = "Running" | "Failed" | "Done";

const WORKING: RunState[] = ["queued", "needs_approval", "running", "needs_input"];
const FAILED: RunState[] = ["failed", "timed_out", "paused", "skipped"];

// Done waits for landing, not for the agent: a task that finished but never landed (phase done,
// state succeeded) keeps its plan under Running. A cleaned task takes the state of the row before
// it, so a plan cleaned up after a failure counts its cleaned tasks as finished, not failed.
export function outcomeOf(plan: DispatchPlanSummary): RunOutcome {
  const sum = (counts: Record<string, number>, names: string[]) => names.reduce((n, s) => n + (counts[s] ?? 0), 0);
  if (sum(plan.states, WORKING) > 0 || sum(plan.phases, ["done"]) > 0) return "Running";
  if (sum(plan.phases, ["landed", "cleaned"]) >= plan.tasks_total) return "Done";
  return sum(plan.states, FAILED) > 0 ? "Failed" : "Running";
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

const STATE_TONE: Record<TaskState, Tone> = {
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

/** A word from a newer backend shows as itself, neutral. */
export const toneOf = (state: string): Tone => STATE_TONE[state as TaskState] ?? "neutral";

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

/** A run row's word: its phase, except a reaped task, whose phase stays failed, reads timed out. */
export function rowState<P extends string>(row: { state: string; phase: P }): P | "timed_out" {
  return row.state === "timed_out" ? "timed_out" : row.phase;
}

// A reaped task's phase stays failed and a task cleaned mid-run leaves no current rows, so
// those two read from Sazed's run state.
export function stateOf(task: DispatchTask): TaskState {
  const latest = last(runRows(task));
  if (latest) return rowState(latest);
  return last(task.rows)?.state === "cancelled" ? "cancelled" : "next";
}

export function columnOf(task: DispatchTask): Column {
  const state = stateOf(task);
  return COLUMN[state] ?? (state === "next" ? "next" : "working");
}

export const isWorking = (task: DispatchTask) => {
  const state = last(runRows(task))?.state;
  return state === "running" || state === "needs_input";
};

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
