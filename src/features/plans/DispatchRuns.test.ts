import { describe, expect, it } from "vitest";

import type { DispatchPlanSummary } from "@/api/dispatch";
import { outcomeOf } from "./dispatchRun";

function plan(states: Record<string, number>, tasks_total = 2): DispatchPlanSummary {
  return {
    plan: "example",
    repo: "owner/repo",
    base: "main",
    host: "runner",
    updated_at: "",
    tasks_total,
    states,
  };
}

describe("outcomeOf", () => {
  it("gives running work precedence over failures and landed tasks", () => {
    expect(outcomeOf(plan({ running: 1, failed: 1, landed: 2 }, 4))).toBe("Running");
  });

  it("gives failures precedence over completed tasks", () => {
    expect(outcomeOf(plan({ failed: 1, landed: 1 }))).toBe("Failed");
  });

  it("is done once every task has landed or been cleaned", () => {
    expect(outcomeOf(plan({ landed: 2 }))).toBe("Done");
    expect(outcomeOf(plan({ landed: 1, cleaned: 1 }))).toBe("Done");
  });

  it("keeps a plan with tasks still to land under Running", () => {
    expect(outcomeOf(plan({ landed: 1 }, 3))).toBe("Running");
    expect(outcomeOf(plan({ landed: 1, done: 1 }))).toBe("Running");
  });
});
