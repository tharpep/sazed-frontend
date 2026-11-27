import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { planWrite } from "@/api/backlog";
import { planFields } from "@/api/command";
import type { ProjectCard } from "@/api/projects";
import { claudeLink, readSessionFields } from "@/api/sessions";
import { mockProject } from "@/mock/projects";
import { getWidget } from "@/widgets/catalog";
import { actorWord, PLAN_NEXT, planStep } from "@/widgets/projectWork";

import { readyText } from "@/features/home/NeedsYou";

import { stripCells } from "./PlanStrip";
import { rowStartsJob } from "./stages";

const project = mockProject("agent-stack")!;
const anyCard = project.workstreams.flatMap((w) => w.cards ?? [])[0];

function card(over: Partial<ProjectCard>): ProjectCard {
  return { ...anyCard, id: "item:x", kind: "item", stage: "next", next: PLAN_NEXT.plan, plan_approval: null, started: null, ...over };
}

const approval = (over: Partial<NonNullable<ProjectCard["plan_approval"]>> = {}) => ({
  at: "2026-11-24T18:02:00+00:00",
  by: "pryce",
  plan: "board-visibility",
  version: 3,
  section: "build",
  changed_since: false,
  ...over,
});

const started = { at: "2026-11-25T09:10:00+00:00", by: "agent:orchestrator" };

describe("plan step", () => {
  it("reads nothing from a Sazed before slice 4", () => {
    const { plan_approval: _a, started: _s, ...old } = card({});
    expect(planStep(old)).toBeNull();
  });

  it("walks plan, ready, started and stale", () => {
    expect(planStep(card({}))).toBe("plan");
    expect(planStep(card({ next: PLAN_NEXT.ready, plan_approval: approval() }))).toBe("ready");
    expect(planStep(card({ next: PLAN_NEXT.stale, plan_approval: approval({ changed_since: true }) }))).toBe("stale");
    expect(planStep(card({ stage: "doing", next: PLAN_NEXT.started, plan_approval: approval(), started }))).toBe("started");
  });

  it("leaves job cards and cards outside the plan states alone", () => {
    expect(planStep(card({ kind: "job" }))).toBeNull();
    expect(planStep(card({ stage: "inbox", next: "Rank it or dismiss it" }))).toBeNull();
  });
});

describe("plan strip", () => {
  it("says by orchestrator for any agent actor, and by you for the owner", () => {
    expect(actorWord("agent:orch-1")).toBe("orchestrator");
    expect(actorWord("pryce")).toBe("you");
    const cells = stripCells("started", { plan_approval: approval(), started });
    expect(cells.map((c) => c.state)).toEqual(["done", "done", "done"]);
    expect(cells[0].sub).toMatch(/^by you, /);
    expect(cells[2].sub).toMatch(/^by orchestrator, /);
  });

  it("marks approve plan as the current step, again when stale", () => {
    expect(stripCells("plan", { plan_approval: null, started: null })[0]).toMatchObject({ state: "current", label: "Approve plan" });
    expect(stripCells("stale", { plan_approval: approval({ changed_since: true }), started: null })[0].label).toBe("Approve plan again");
    expect(stripCells("ready", { plan_approval: approval(), started: null }).map((c) => c.state)).toEqual(["done", "current", "pending"]);
  });
});

describe("old shapes under the new schemas", () => {
  const schema = getWidget("ProjectWidget")!.props;

  const withCards = (map: (c: ProjectCard) => object) => ({
    ...project,
    workstreams: project.workstreams.map((w) => ({ ...w, cards: w.cards?.map(map) })),
  });
  const firstCard = (parsed: unknown) => (parsed as typeof project).workstreams.find((w) => w.cards?.length)!.cards![0];

  it("parse a project whose cards predate plan_approval and started, and refuse a malformed one", () => {
    expect(schema.safeParse(withCards(({ plan_approval: _a, started: _s, ...c }) => c)).success).toBe(true);
    expect(schema.safeParse(withCards((c) => ({ ...c, plan_approval: { at: "x", by: 5 } }))).success).toBe(false);
    expect(schema.safeParse(withCards((c) => ({ ...c, started: { by: "pryce" } }))).success).toBe(false);
  });

  it("parse a project whose cards carry both, and keep them", () => {
    const parsed = schema.parse(withCards((c) => ({ ...c, plan_approval: approval({ by: "agent:orch" }), started })));
    expect(firstCard(parsed).plan_approval).toEqual(approval({ by: "agent:orch" }));
    expect(firstCard(parsed).started).toEqual(started);
  });

  it("read an old command as having neither plan key", () => {
    const old = { needs: [], working: [], done: { succeeded: 0, failed: 0, latest: [], window_hours: 24 } };
    expect(planFields.parse(old)).toEqual({ plans_to_approve: undefined, ready_to_start: undefined });
  });

  it("drop a malformed value or card alone", () => {
    expect(planFields.parse({ plans_to_approve: "x", ready_to_start: "2" })).toEqual({ plans_to_approve: undefined, ready_to_start: undefined });
    const parsed = planFields.parse({ plans_to_approve: [card({}), { id: 3 }, null], ready_to_start: 2 });
    expect(parsed.plans_to_approve).toHaveLength(1);
    expect(parsed.ready_to_start).toBe(2);
  });

  it("read a session's role, absent when missing or not a string", () => {
    const row = { session_id: "s1", last_heard_at: "2026-11-25T10:00:00+00:00" };
    const { sessions } = readSessionFields({ sessions: [row, { ...row, role: 7 }, { ...row, role: "orchestrator" }] });
    expect(sessions?.map((s) => s.role)).toEqual([undefined, undefined, "orchestrator"]);
  });
});

describe("link out", () => {
  it("opens the Claude Code session list until check A0 picks the per-session URL", () => {
    expect(claudeLink({ session_id: "7c0e5a7e" })).toBe("https://claude.ai/code");
  });
});

describe("plan-state writes", () => {
  const path = (url: string) => decodeURIComponent(new URL(url, "http://sazed.test").pathname);
  const sent: { url: string; method: string; body: unknown }[] = [];
  let answer: (url: string) => Response;

  beforeEach(() => {
    sent.length = 0;
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      sent.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : null });
      return answer(url);
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

  it.each([
    ["approve", "/backlog/abc/approve-plan", { by: "pryce" }],
    ["start", "/backlog/abc/start", { by: "pryce" }],
    ["withdraw-start", "/backlog/abc/withdraw", { by: "pryce", step: "start" }],
    ["withdraw-approval", "/backlog/abc/withdraw", { by: "pryce", step: "approval" }],
  ] as const)("%s posts to its route as the owner", async (action, route, body) => {
    answer = () => ok({ changed: true, card: card({}) });
    const result = await planWrite(action, "abc");
    expect(sent).toHaveLength(1);
    expect(sent[0].method).toBe("POST");
    expect(path(sent[0].url)).toBe(route);
    expect(sent[0].body).toEqual(body);
    expect(result.error).toBeNull();
    expect(result.card?.id).toBe("item:x");
  });

  it("a 409 shows its reason and reloads the card", async () => {
    const reason = "the card's plan or section changed since approval; approve it again";
    const fresh = card({ next: PLAN_NEXT.stale, plan_approval: approval({ changed_since: true }) });
    answer = (url) =>
      url.endsWith("/start") ? new Response(JSON.stringify({ detail: reason }), { status: 409 }) : ok(fresh);
    const result = await planWrite("start", "abc");
    expect(result.error).toBe(reason);
    expect(sent.map((r) => `${r.method} ${path(r.url)}`)).toEqual(["POST /backlog/abc/start", "GET /board/item:abc"]);
    expect(result.card && planStep(result.card)).toBe("stale");
  });

  it("another refusal shows its reason without a reload", async () => {
    answer = () => new Response(JSON.stringify({ detail: "only pryce can withdraw an approval or a start" }), { status: 403 });
    const result = await planWrite("withdraw-start", "abc");
    expect(result).toEqual({ card: null, error: "only pryce can withdraw an approval or a start" });
    expect(sent).toHaveLength(1);
  });
});

describe("board rows", () => {
  const open = { status: "shortlisted" as const, repos: ["tharpep/sazed"] };

  it("never offer the one-click job start on a card with plan states", () => {
    expect(rowStartsJob(card({}), open)).toBe(false);
    expect(rowStartsJob(card({ next: PLAN_NEXT.ready, plan_approval: approval() }), open)).toBe(false);
  });

  it("keep it for a card from a Sazed before slice 4", () => {
    const { plan_approval: _a, started: _s, ...old } = card({});
    expect(rowStartsJob(old, open)).toBe(true);
    expect(rowStartsJob(old, { ...open, repos: [] })).toBe(false);
  });
});

describe("Ready to start line", () => {
  it("hides at 0 and when absent, and counts otherwise", () => {
    expect(readyText(0)).toBeNull();
    expect(readyText(undefined)).toBeNull();
    expect(readyText(1)).toBe("Ready to start: 1 card with an approved plan.");
    expect(readyText(5)).toBe("Ready to start: 5 cards with approved plans.");
  });
});
