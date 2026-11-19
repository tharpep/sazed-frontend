import { describe, expect, it } from "vitest";

import type { DispatchPhase, DispatchPlanSummary, DispatchRow, DispatchTask } from "@/api/dispatch";
import type { RunState } from "@/api/jobs";
import { counts } from "./DispatchRuns";
import { columnOf, isWorking, outcomeOf, stateOf, stateWord, toneOf } from "./dispatchRun";

function plan(states: Record<string, number>, phases: Record<string, number>, tasks_total = 2): DispatchPlanSummary {
  return {
    plan: "example",
    repo: "owner/repo",
    base: "main",
    host: "runner",
    updated_at: "",
    tasks_total,
    states,
    phases,
  };
}

function row(state: RunState, phase: DispatchPhase, ts: number): DispatchRow {
  return {
    plan: "example",
    task: "t1",
    ts,
    state,
    phase,
    line: "",
    ref: null,
    cost_usd: null,
    session: null,
    meta: {},
    received_at: new Date(ts * 1000).toISOString(),
  };
}

function task(rows: DispatchRow[]): DispatchTask {
  return { id: "t1", goal: "", owns: [], depends_on: [], profile: "implement", model: "sonnet", latest: rows[rows.length - 1] ?? null, rows };
}

describe("outcomeOf", () => {
  it("gives running work precedence over failures and finished tasks", () => {
    expect(outcomeOf(plan({ running: 1, failed: 1, succeeded: 2 }, { running: 1, failed: 1, landed: 2 }, 4))).toBe("Running");
    expect(outcomeOf(plan({ needs_input: 1, succeeded: 1 }, { waiting: 1, landed: 1 }))).toBe("Running");
  });

  it("gives failures, timeouts and skipped tasks precedence over landed tasks", () => {
    expect(outcomeOf(plan({ failed: 1, succeeded: 1 }, { conflict: 1, landed: 1 }))).toBe("Failed");
    expect(outcomeOf(plan({ timed_out: 1, succeeded: 1 }, { failed: 1, landed: 1 }))).toBe("Failed");
    expect(outcomeOf(plan({ skipped: 1, succeeded: 1 }, { blocked: 1, landed: 1 }))).toBe("Failed");
  });

  it("is done once every task has landed or been cleaned", () => {
    expect(outcomeOf(plan({ succeeded: 2 }, { landed: 2 }))).toBe("Done");
    expect(outcomeOf(plan({ succeeded: 1, cancelled: 1 }, { landed: 1, cleaned: 1 }))).toBe("Done");
  });

  it("keeps a plan whose finished tasks have not landed under Running", () => {
    expect(outcomeOf(plan({ succeeded: 2 }, { done: 2 }))).toBe("Running");
    expect(outcomeOf(plan({ succeeded: 3 }, { landed: 2, done: 1 }, 3))).toBe("Running");
  });

  it("counts a plan cleaned up after a failure as done", () => {
    expect(outcomeOf(plan({ failed: 2 }, { cleaned: 2 }))).toBe("Done");
  });

  it("keeps a plan with tasks still planned under Running", () => {
    expect(outcomeOf(plan({ succeeded: 1, planned: 2 }, { landed: 1, planned: 2 }, 3))).toBe("Running");
  });
});

describe("counts", () => {
  it("names run states with the job words, in order", () => {
    expect(counts({ succeeded: 2, planned: 1, timed_out: 1, running: 1 })).toBe(
      "1 running · 1 timed out · 2 done · 1 not started"
    );
  });

  it("keeps a state it doesn't know as its raw word", () => {
    expect(counts({ succeeded: 1, held: 2 })).toBe("1 done · 2 held");
  });
});

describe("stateOf", () => {
  it("keeps the integration word for the card", () => {
    expect(stateOf(task([row("running", "running", 1), row("succeeded", "landed", 2)]))).toBe("landed");
    expect(stateOf(task([row("running", "running", 1), row("failed", "conflict", 2)]))).toBe("conflict");
  });

  it("reads a reaped task as timed out", () => {
    const reaped = task([row("running", "running", 1), row("timed_out", "failed", 2)]);
    expect(stateOf(reaped)).toBe("timed_out");
    expect(stateWord(stateOf(reaped))).toBe("timed out");
    expect(toneOf(stateOf(reaped))).toBe("err");
    expect(columnOf(reaped)).toBe("working");
    expect(isWorking(reaped)).toBe(false);
  });

  it("counts only running and asking tasks as working", () => {
    expect(isWorking(task([row("running", "running", 1)]))).toBe(true);
    expect(isWorking(task([row("running", "running", 1), row("needs_input", "waiting", 2)]))).toBe(true);
    expect(isWorking(task([row("running", "running", 1), row("failed", "failed", 2)]))).toBe(false);
  });

  it("shows a phase it doesn't know as its raw word, neutral, among started tasks", () => {
    const odd = task([row("running", "running", 1), row("succeeded", "parked" as DispatchPhase, 2)]);
    expect(stateWord(stateOf(odd))).toBe("parked");
    expect(toneOf(stateOf(odd))).toBe("neutral");
    expect(columnOf(odd)).toBe("working");
  });

  it("reads a task cleaned while running as cancelled", () => {
    const cleaned = task([row("running", "running", 1), row("cancelled", "cleaned", 2)]);
    expect(stateOf(cleaned)).toBe("cancelled");
    expect(stateWord(stateOf(cleaned))).toBe("cancelled");
    expect(columnOf(cleaned)).toBe("working");
  });

  it("starts over after a task is cleaned once it landed", () => {
    const rerun = task([row("succeeded", "landed", 1), row("succeeded", "cleaned", 2)]);
    expect(stateOf(rerun)).toBe("next");
    expect(stateWord("next")).toBe("not started");
  });
});
