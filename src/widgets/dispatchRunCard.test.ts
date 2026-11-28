import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import * as cards from "@/mock/cardSamples";
import * as samples from "@/mock/dispatchSamples";

import { getWidget } from "./catalog";
import { DispatchRunWidget, groupOf, nextLine } from "./DispatchRunWidget";
import { NeedsYouWidget, needsAnswer, needsParts } from "./NeedsYouWidget";

const schema = getWidget("DispatchRunWidget")!.props;
const all = [samples.dispatchRunning, samples.dispatchEmpty, samples.dispatchAsking, samples.dispatchFailed, samples.dispatchFinished, samples.dispatchOversized];

describe("DispatchRunWidget props", () => {
  it("parse every sample, the empty plan included", () => {
    for (const s of all) expect(schema.safeParse(s).success).toBe(true);
  });

  it("parse a raw plan detail as Sazed sends it, rows and steps included", () => {
    const raw = {
      plan: "p",
      repo: "tharpep/x",
      base: "main",
      host: "ct110",
      updated_at: "2026-11-22T21:56:50+00:00",
      tasks_total: 1,
      states: { succeeded: 1 },
      phases: { landed: 1 },
      now: "2026-11-27T03:23:51+00:00",
      tasks: [
        {
          id: "a",
          goal: "Do a thing.",
          owns: ["src/a.ts"],
          depends_on: [],
          profile: "builder",
          model: "sonnet",
          latest: { plan: "p", task: "a", ts: 1, state: "succeeded", phase: "landed", line: "landed", ref: null, cost_usd: 0.4, session: null, meta: {}, received_at: "2026-11-22T22:04:38+00:00" },
          rows: [],
          steps: [{ ts: 1, seq: 1, kind: "tool", tool: "Edit", text: "src/a.ts", error: false, received_at: "2026-11-22T22:04:00+00:00" }],
          tools: 4,
        },
      ],
    };
    expect(schema.safeParse(raw).success).toBe(true);
  });

  it("parse a phase or state word this console does not know, and draw it as a neutral square", () => {
    const view = { ...samples.dispatchFinished, tasks: [{ ...samples.dispatchFinished.tasks[0], latest: { state: "archived", phase: "shelved", line: "x" } }] };
    expect(schema.safeParse(view).success).toBe(true);
    expect(groupOf(view.tasks[0])).toBe("other");
    expect(renderToStaticMarkup(createElement(DispatchRunWidget, view))).toContain("shelved");
  });

  it("fail a plan with no tasks list", () => {
    expect(schema.safeParse({ plan: "p", repo: "r", tasks_total: 0 }).success).toBe(false);
  });
});

describe("Dispatch run reading", () => {
  const task = (state: string, phase: string) => ({ id: "t", goal: "g", depends_on: [], latest: { state, phase, line: "" } });

  it("group tasks by the console's rule: phase first, run state where it says more", () => {
    expect(groupOf({ id: "t", goal: "g", depends_on: [], latest: null })).toBe("next");
    expect(groupOf(task("running", "running"))).toBe("working");
    expect(groupOf(task("needs_input", "waiting"))).toBe("asking");
    expect(groupOf(task("succeeded", "done"))).toBe("landing");
    expect(groupOf(task("succeeded", "landed"))).toBe("landed");
    expect(groupOf(task("timed_out", "failed"))).toBe("failed");
    expect(groupOf(task("failed", "conflict"))).toBe("failed");
  });

  it("say which task is next and what it waits on", () => {
    const groups = new Map(samples.dispatchRunning.tasks.map((t) => [t.id, groupOf(t)]));
    expect(nextLine(samples.dispatchRunning.tasks, groups)).toBe("Next: t6 after t3 and t4 land");
    const finished = new Map(samples.dispatchFinished.tasks.map((t) => [t.id, groupOf(t)]));
    expect(nextLine(samples.dispatchFinished.tasks, finished)).toBeNull();
  });

  it("answer with landed of total and the other counts", () => {
    const html = renderToStaticMarkup(createElement(DispatchRunWidget, samples.dispatchRunning));
    expect(html).toContain("2 of 6 landed");
    expect(html).toContain("2 working · 1 asking");
    expect(html).toContain("t5 asks: Backfill all runs or the last 30 days?");
    expect(html).toContain('href="https://sazed.tail77c590.ts.net/?open=dispatch:one-stack-seam-5"');
  });

  it("draw an open_url outside the console shape as plain text", () => {
    const html = renderToStaticMarkup(createElement(DispatchRunWidget, { ...samples.dispatchRunning, open_url: "https://evil.example/" }));
    expect(html).not.toContain("<a");
  });
});

describe("Needs you totals", () => {
  const parts = needsParts(cards.needsYouOversized.needs);

  it("count the listed rows when the gateway sends no totals, as before", () => {
    expect(needsAnswer(parts, cards.needsYouOversized)).toBe(needsAnswer(parts));
    expect(needsAnswer(parts)).toBe("1 question, 43 PRs ready to merge, 6 other items");
    expect(renderToStaticMarkup(createElement(NeedsYouWidget, cards.needsYouOversized))).toContain("+39 more · 6 reviewed, 37 no review · 14 not listed");
  });

  it("use the gateway's totals in the headline and the reviewed line when it sends them", () => {
    const view = { ...cards.needsYouOversized, question_total: 3, merge_total: 52, merge_reviewed: 9, working_total: 12 };
    expect(needsAnswer(parts, view)).toBe("3 questions, 52 PRs ready to merge, 9 other items");
    const html = renderToStaticMarkup(createElement(NeedsYouWidget, view));
    expect(html).toContain("+48 more · 9 reviewed, 43 no review · 5 not listed");
    expect(html).toContain("Running: 17");
  });
});
