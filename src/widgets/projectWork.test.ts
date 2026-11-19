import { describe, expect, it } from "vitest";

import type { ProjectCard, Workstream, WorkstreamStatus } from "@/api/projects";
import {
  cardFacts,
  countLine,
  foldSteps,
  groupStepCards,
  prRef,
  sessionLabel,
  stepNumbers,
  stepOf,
  trackText,
} from "./projectWork";

function card(over: Partial<ProjectCard>): ProjectCard {
  return {
    id: `item:${Math.random()}`,
    kind: "item",
    source: "backlog",
    title: "A card",
    stage: "next",
    next: "",
    updated_at: "2026-11-19T10:00:00Z",
    done_at: null,
    session_link: null,
    repo: "sazed",
    item_type: "planned",
    effort: null,
    impact: null,
    rank: null,
    workstream_id: "w1",
    actions: [],
    job_id: null,
    job_status: null,
    ci_state: null,
    fix_count: null,
    pr_number: null,
    pr_url: null,
    pr_draft: null,
    plan_id: null,
    plan_section: null,
    plan_version: null,
    ...over,
  };
}

function step(id: string, status: WorkstreamStatus): Workstream {
  return {
    id,
    title: `Step ${id}`,
    summary: "",
    position: 0,
    state: status === "done" ? "done" : status === "dropped" ? "dropped" : "open",
    status,
    depends_on: [],
    progress: { done: 0, in_flight: 0, needs_me: 0, next: 0, total: 0 },
    bar: { done: 0, in_flight: 0, needs_me: 0, next: 0 },
  };
}

describe("groupStepCards", () => {
  it("orders waiting on you, in flight, not started, done, and leaves empty groups out", () => {
    const groups = groupStepCards([
      card({ stage: "done" }),
      card({ stage: "inbox" }),
      card({ stage: "needs_me" }),
      card({ stage: "next" }),
    ]);
    expect(groups.map((g) => [g.group, g.cards.length])).toEqual([
      ["waiting", 1],
      ["todo", 2],
      ["done", 1],
    ]);
  });

  it("puts ranked cards first in Not started, by rank, keeping the rest in order", () => {
    const groups = groupStepCards([
      card({ title: "u1" }),
      card({ title: "r2", rank: 2 }),
      card({ title: "u2", stage: "inbox" }),
      card({ title: "r1", rank: 1 }),
    ]);
    expect(groups[0].cards.map((c) => c.title)).toEqual(["r1", "r2", "u1", "u2"]);
  });

  it("counts by state with empty states left out", () => {
    const cards = [
      ...Array.from({ length: 7 }, () => card({ stage: "done" })),
      ...Array.from({ length: 18 }, () => card({ stage: "doing" })),
      ...Array.from({ length: 32 }, () => card({ stage: "next" })),
    ];
    expect(countLine(groupStepCards(cards))).toBe("7 done · 18 in flight · 32 not started");
  });
});

describe("foldSteps", () => {
  it("folds a leading run of two or more done steps and keeps a later done step on its own", () => {
    const steps = ["done", "done", "done", "done", "next", "done", "planned"].map((s, i) => step(`s${i}`, s as WorkstreamStatus));
    const entries = foldSteps(steps);
    expect(entries[0]).toMatchObject({ kind: "fold" });
    expect(entries[0].kind === "fold" && entries[0].steps.map((s) => s.index)).toEqual([0, 1, 2, 3]);
    expect(entries.slice(1).map((e) => (e.kind === "step" ? e.index : -1))).toEqual([4, 5, 6]);
  });

  it("does not fold a single leading done step", () => {
    const entries = foldSteps([step("a", "done"), step("b", "next")]);
    expect(entries.every((e) => e.kind === "step")).toBe(true);
  });
});

describe("prRef", () => {
  it("builds repo#number from a session link", () => {
    expect(prRef({ session: "s", branch: "b", pr_repo: "tharpep/chat-service", pr_number: 129 })).toBe("chat-service#129");
  });

  it("is null when the link names no PR", () => {
    expect(prRef({ session: "s", branch: "b", pr_repo: null, pr_number: null })).toBeNull();
    expect(prRef(null)).toBeNull();
  });
});

describe("cardFacts", () => {
  it("never prints Sazed's two filler lines", () => {
    expect(cardFacts(card({ next: "Approve it to start" })).text).toBe("sazed");
    expect(cardFacts(card({ stage: "doing", next: "Being built in a terminal session" })).text).toBe("sazed");
  });

  it("gives an in-flight card its session and PR, and a waiting card its next text", () => {
    const link = { session: "ae92ef80-10d8-4188-95e2-4f13a23aa8ef", branch: "b", pr_repo: "tharpep/chat-service", pr_number: 117 };
    expect(cardFacts(card({ stage: "doing", session_link: link })).text).toBe("sazed · ae92ef80 · chat-service#117");
    expect(cardFacts(card({ stage: "needs_me", next: "Ready to merge" }))).toEqual({ text: "sazed · Ready to merge", warn: true });
  });

  it("shortens only UUID session names", () => {
    expect(sessionLabel("worker-runtime")).toBe("worker-runtime");
  });
});

describe("step numbers", () => {
  const steps = [step("a", "done"), step("x", "dropped"), step("b", "in_flight"), step("c", "blocked")];

  it("leave a dropped step unnumbered and number the rest by position", () => {
    expect([...stepNumbers(steps)]).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
  });

  it("keep Step X within N when a dropped step comes before the current one", () => {
    expect(stepOf(steps, "b")).toBe("Step 2 of 3");
    expect(trackText(steps, "b")).toBe("Step 2 of 3: 1 done, 1 in flight, 1 blocked");
  });
});
