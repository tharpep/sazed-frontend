import { describe, expect, it } from "vitest";

import { hoursMinutes, readDispatchJob } from "./DispatchPreview";

describe("readDispatchJob", () => {
  it("reads the contract's params and a finished job's meta", () => {
    const d = readDispatchJob({
      params: {
        plan_id: "check-additive-v1",
        plan: {
          id: "check-additive-v1",
          tasks: [
            { id: "t1", goal: "Add it", owns: ["a.py"], depends_on: [], check: "x", profile: "code-small" },
            { id: "t2", goal: "Test it", owns: ["tests/"], depends_on: ["t1"], profile: "code-small" },
          ],
        },
        plan_hash: "0123456789abcdef0123",
        repo: "tharpep/sazed-worker",
        base: "main",
        budget_usd: 5,
        task_caps: { t1: 1.5, t2: 2 },
        timeout_s: 7200,
        parallel: 1,
        title: "PR title",
      },
      meta: { cost_usd: 1.25, tasks: { t1: "succeeded" } },
    });
    expect(d).toMatchObject({
      repo: "tharpep/sazed-worker",
      base: "main",
      title: "PR title",
      budget: 5,
      capsTotal: 3.5,
      timeout_s: 7200,
      parallel: 1,
      hash: "0123456789ab",
      spent: 1.25,
    });
    expect(d.tasks).toEqual([
      { id: "t1", goal: "Add it", profile: "code-small", owns: ["a.py"], depends_on: [], cap: 1.5, state: "succeeded" },
      { id: "t2", goal: "Test it", profile: "code-small", owns: ["tests/"], depends_on: ["t1"], cap: 2, state: null },
    ]);
  });

  it("survives missing and malformed fields", () => {
    const empty = readDispatchJob({ params: undefined as never, meta: undefined as never });
    expect(empty).toMatchObject({ repo: null, tasks: [], budget: null, capsTotal: null, hash: null, spent: null });
    const odd = readDispatchJob({
      params: { plan: { tasks: [null, { goal: 3, owns: "a.py" }] }, task_caps: [], budget_usd: "5" },
      meta: {},
    });
    expect(odd.tasks).toEqual([{ id: "task 1", goal: null, profile: null, owns: [], depends_on: [], cap: null, state: null }]);
    expect(odd.budget).toBeNull();
  });
});

describe("hoursMinutes", () => {
  it("reads a wall-clock cap", () => {
    expect(hoursMinutes(7200)).toBe("2h");
    expect(hoursMinutes(5400)).toBe("1h 30m");
    expect(hoursMinutes(600)).toBe("10m");
    expect(hoursMinutes(3599)).toBe("1h");
    expect(hoursMinutes(3599)).toBe("1h");
    expect(hoursMinutes(30)).toBe("30s");
  });
});
