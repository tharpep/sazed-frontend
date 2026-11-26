import { describe, expect, it } from "vitest";

import { planFields } from "@/api/command";
import type { ProjectCard } from "@/api/projects";
import { claudeLink, readSessionFields } from "@/api/sessions";
import { mockProject } from "@/mock/projects";
import { getWidget } from "@/widgets/catalog";
import { actorWord, PLAN_NEXT, planStep } from "@/widgets/projectWork";

import { stripCells } from "./PlanStrip";

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

  it("parse a project whose cards predate plan_approval and started", () => {
    const older = {
      ...project,
      workstreams: project.workstreams.map((w) => ({
        ...w,
        cards: w.cards?.map(({ plan_approval: _a, started: _s, ...c }) => c),
      })),
    };
    expect(schema.safeParse(older).success).toBe(true);
  });

  it("parse a project whose cards carry both", () => {
    const newer = {
      ...project,
      workstreams: project.workstreams.map((w) => ({
        ...w,
        cards: w.cards?.map((c) => ({ ...c, plan_approval: approval({ by: "agent:orch" }), started })),
      })),
    };
    expect(schema.safeParse(newer).success).toBe(true);
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
