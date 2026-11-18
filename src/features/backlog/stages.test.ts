import { describe, expect, it } from "vitest";

import type { BacklogItem } from "@/api/backlog";
import type { CardStage, ProjectCard } from "@/api/projects";
import { NEXT_LIMIT, STAGES, backlogId, groupByStage, olderDone, openingStage, shownNext } from "./stages";

function card(id: string, stage: CardStage, extra: Partial<ProjectCard> = {}): ProjectCard {
  return {
    id: `item:${id}`,
    kind: "item",
    source: "backlog",
    title: id,
    stage,
    next: "",
    updated_at: "2026-11-18T00:00:00Z",
    repo: null,
    item_type: "bug",
    effort: null,
    impact: null,
    rank: null,
    workstream_id: null,
    actions: [],
    job_id: null,
    job_status: null,
    ci_state: null,
    fix_count: 0,
    pr_number: null,
    pr_url: null,
    pr_draft: false,
    plan_id: null,
    plan_section: null,
    plan_version: null,
    ...extra,
  };
}

const item = (id: string, status: BacklogItem["status"]) => ({ id, status }) as BacklogItem;

describe("groupByStage", () => {
  it("puts every card under exactly one stage", () => {
    const cards = STAGES.flatMap((s, i) => [card(`${s.id}a`, s.id), card(`${s.id}b`, s.id, { rank: i })]);
    const groups = groupByStage(cards, "all");
    expect(Object.keys(groups)).toEqual(STAGES.map((s) => s.id));
    for (const s of STAGES) expect(groups[s.id]).toHaveLength(2);
    expect(Object.values(groups).flat()).toHaveLength(cards.length);
  });

  it("orders Next by rank, unranked cards last in the order they came", () => {
    const groups = groupByStage(
      [card("u1", "next"), card("r2", "next", { rank: 2 }), card("u2", "next"), card("r1", "next", { rank: 1 })],
      "all"
    );
    expect(groups.next.map((c) => c.title)).toEqual(["r1", "r2", "u1", "u2"]);
  });

  it("keeps only the picked type, which a job card never has", () => {
    const groups = groupByStage(
      [card("b", "inbox"), card("g", "inbox", { item_type: "gap" }), card("j", "doing", { kind: "job", item_type: null })],
      "gap"
    );
    expect(groups.inbox.map((c) => c.title)).toEqual(["g"]);
    expect(groups.doing).toEqual([]);
  });
});

describe("openingStage", () => {
  const groups = (...stages: CardStage[]) => groupByStage(stages.map((s, i) => card(String(i), s)), "all");

  it("opens on Needs me when anything waits on Pryce", () => {
    expect(openingStage(groups("inbox", "next", "needs_me"))).toBe("needs_me");
  });

  it("falls back to Inbox, then Next", () => {
    expect(openingStage(groups("inbox", "next", "done"))).toBe("inbox");
    expect(openingStage(groups("next", "doing"))).toBe("next");
    expect(openingStage(groups("done"))).toBe("next");
  });
});

describe("shownNext", () => {
  const next = Array.from({ length: NEXT_LIMIT + 3 }, (_, i) => card(String(i), "next", { rank: i + 1 }));

  it("shows the top ten until asked for all", () => {
    expect(NEXT_LIMIT).toBe(10);
    expect(shownNext(next, false).map((c) => c.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(shownNext(next, true)).toHaveLength(13);
  });
});

describe("olderDone", () => {
  it("is the done items the board's 14-day window left out", () => {
    const board = [card("recent", "done")];
    const done = [item("recent", "done"), item("old", "done"), item("approved", "approved")];
    expect(olderDone(board, done).map((i) => i.id)).toEqual(["old"]);
  });
});

describe("backlogId", () => {
  it("strips the item prefix and has none for a job card", () => {
    expect(backlogId(card("abc", "next"))).toBe("abc");
    expect(backlogId(card("x", "doing", { id: "job:x", kind: "job" }))).toBeNull();
  });
});
