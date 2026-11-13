import { describe, expect, it } from "vitest";

import type { DispatchPlanSummary } from "@/api/dispatch";
import { outcomeOf } from "./DispatchRuns";

function plan(states: Record<string, number>): DispatchPlanSummary {
  return {
    plan: "example",
    repo: "owner/repo",
    base: "main",
    host: "runner",
    updated_at: "",
    tasks_total: 1,
    states,
  };
}

describe("outcomeOf", () => {
  it("gives running work precedence over failures and landed tasks", () => {
    expect(outcomeOf(plan({ running: 1, failed: 1, landed: 2 }))).toBe("Running");
  });

  it("gives failures precedence over completed tasks", () => {
    expect(outcomeOf(plan({ failed: 1, landed: 2 }))).toBe("Failed");
  });

  it("classifies plans without active or failed tasks as done", () => {
    expect(outcomeOf(plan({ landed: 2 }))).toBe("Done");
  });
});
