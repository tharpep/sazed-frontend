import type { DispatchRow, DispatchTask } from "@/api/dispatch";
import type { Tone } from "@/components/system";

export type Column = "landed" | "working" | "landing" | "next";
export type TaskState = DispatchRow["state"] | "next";

const COLUMN: Partial<Record<TaskState, Column>> = {
  landed: "landed",
  running: "working",
  waiting: "working",
  failed: "working",
  conflict: "working",
  blocked: "working",
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
  next: "neutral",
};

export const last = <T,>(xs: T[]): T | undefined => xs[xs.length - 1];

export const at = (row: DispatchRow) => Date.parse(row.received_at);

export function runRows(task: DispatchTask): DispatchRow[] {
  const cleaned = task.rows.map((r) => r.state).lastIndexOf("cleaned");
  return task.rows.slice(cleaned + 1);
}

export const stateOf = (task: DispatchTask): TaskState => last(runRows(task))?.state ?? "next";

export const columnOf = (task: DispatchTask): Column => COLUMN[stateOf(task)] ?? "next";

export const costOf = (task: DispatchTask) => runRows(task).reduce((sum, r) => sum + (r.cost_usd ?? 0), 0);

export const tries = (task: DispatchTask) => runRows(task).filter((r) => r.state === "running").length;

export function isSettled(tasks: DispatchTask[]): boolean {
  return tasks.every((t) => stateOf(t) === "landed");
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
}

export const dollars = (n: number) => `$${n.toFixed(2)}`;
