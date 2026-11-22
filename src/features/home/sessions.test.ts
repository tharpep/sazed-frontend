import { describe, expect, it } from "vitest";

import type { Project, ProjectCard } from "@/api/projects";
import { readSessionFields, type Session, type SessionAgent, type SessionStep } from "@/api/sessions";

import {
  agentLine,
  heardOf,
  linkWord,
  listSome,
  orderSessions,
  questionCount,
  sessionTitle,
  span,
  staleSessions,
  staleSteps,
  statusWord,
  stepText,
  subagents,
  visibleSteps,
} from "./sessions";

const NOW = Date.parse("2026-11-21T12:00:00Z");

function session(id: string, over: Partial<Session> = {}): Session {
  return {
    session_id: id,
    host: "laptop",
    cwd: null,
    repo: "tharpep/sazed",
    branch: "feature/x",
    started_at: "2026-11-21T08:10:00Z",
    last_heard_at: "2026-11-21T11:59:20Z",
    ended_at: null,
    state: "running",
    status: "running",
    doing: null,
    doing_source: null,
    doing_at: null,
    question: null,
    link: { status: "none", card_id: null, candidates: [] },
    card: null,
    project: null,
    pr: null,
    ...over,
  };
}

function step(i: number, over: Partial<SessionStep> = {}): SessionStep {
  return { ts: 1763650800 + i, at: "2026-11-21T11:00:00Z", seq: 0, kind: "tool", tool: "Bash", target: "ls", text: "", error: false, ...over };
}

describe("session status and last heard", () => {
  it("warns only when Sazed says not heard from, whatever the console's clock says", () => {
    expect(heardOf("2026-11-21T11:59:20Z", "running", NOW)).toEqual({ text: "last heard 40s ago", warn: false });
    expect(heardOf("2026-11-21T11:30:00Z", "not_heard_from", NOW)).toEqual({ text: "last heard 30 min ago", warn: true });
    // Idle for two hours is waiting on Pryce, not a fault.
    expect(heardOf("2026-11-21T10:00:00Z", "idle", NOW)).toEqual({ text: "last heard 2h ago", warn: false });
  });

  it("names idle and quiet sessions and leaves running ones to their elapsed time", () => {
    expect(statusWord("idle")).toBe("idle");
    expect(statusWord("not_heard_from")).toBe("not heard from");
    expect(statusWord("running")).toBeNull();
    expect(statusWord("paused_by_newer_sazed")).toBeNull();
  });

  it("formats time since start", () => {
    expect(span("2026-11-21T08:10:00Z", NOW)).toBe("3h 50m");
    expect(span("2026-11-21T11:48:00Z", NOW)).toBe("12m");
    expect(span(null, NOW)).toBe("");
  });
});

describe("session rows", () => {
  it("names a session by its card, else branch, else repo, else short id", () => {
    const card = { id: "item:1", title: "Session events", stage: "doing", next: "" };
    expect(sessionTitle(session("s", { card }))).toBe("Session events");
    expect(sessionTitle(session("s", { branch: "feature/fix" }))).toBe("feature/fix");
    expect(sessionTitle(session("s", { branch: "main" }))).toBe("sazed");
    expect(sessionTitle(session("7c0e5a7e-2b1f-4f57-9a43-3d0f2f1a9c11", { branch: null, repo: null }))).toBe("Session 7c0e5a7e");
  });

  it("says no card, or why the link failed", () => {
    expect(linkWord(session("s"))).toBe("no card");
    expect(linkWord(session("s", { link: { status: "ambiguous", card_id: null, candidates: ["item:a", "item:b"] } }))).toBe("2 cards match");
    expect(linkWord(session("s", { link: { status: "unknown_card", card_id: null, candidates: ["item:z"] } }))).toBe("card not on the board");
    const linked = session("s", {
      card: { id: "item:1", title: "t", stage: "doing", next: "" },
      project: { slug: "board", title: "The board" },
    });
    expect(linkWord(linked)).toBe("The board");
  });

  it("puts a question first, then running, quiet and idle, keeping Sazed's order within each", () => {
    const q = { text: "Allow Bash?", agent_id: null, asked_at: "2026-11-21T11:59:00Z" };
    const list = [
      session("idle", { status: "idle" }),
      session("run1"),
      session("quiet", { status: "not_heard_from" }),
      session("ask", { status: "idle", question: q }),
      session("run2"),
    ];
    expect(orderSessions(list).map((s) => s.session_id)).toEqual(["ask", "run1", "run2", "quiet", "idle"]);
    expect(questionCount(list)).toBe(1);
    expect(questionCount(undefined)).toBe(0);
  });
});

describe("agents and steps", () => {
  const agent = (id: string | null, steps: SessionStep[], state = "running"): SessionAgent => ({
    agent_id: id,
    agent_type: id ? "Explore" : "main",
    state,
    first_at: null,
    last_at: null,
    steps,
  });

  it("lists subagents only, in Sazed's order", () => {
    expect(subagents([agent(null, []), agent("a", []), agent("b", [])]).map((a) => a.agent_id)).toEqual(["a", "b"]);
    expect(subagents(undefined)).toEqual([]);
  });

  it("shows the newest steps, newest last, and counts the earlier ones", () => {
    const steps = Array.from({ length: 200 }, (_, i) => i);
    const cut = visibleSteps(steps, false);
    expect(cut.earlier).toBe(192);
    expect(cut.rows).toEqual(steps.slice(192));
    expect(cut.rows[cut.rows.length - 1]).toBe(199);
    expect(visibleSteps(steps, true)).toEqual({ earlier: 0, rows: steps });
    expect(visibleSteps([1, 2, 3], false)).toEqual({ earlier: 0, rows: [1, 2, 3] });
  });

  it("reads a step as tool, target and one line, and other kinds as a word", () => {
    expect(stepText(step(0, { tool: "Edit", target: "a.py", text: "+3 -1" }))).toEqual({ head: "Edit", target: "a.py", line: "+3 -1" });
    expect(stepText(step(0, { kind: "doing", tool: null, target: null, text: "Write it" })).head).toBe("Doing");
    expect(stepText(step(0, { kind: "brand_new", tool: null })).head).toBe("brand_new");
  });

  it("gives an agent row its newest tool call", () => {
    const a = agent("a", [step(0, { tool: "Read", target: "x.py" }), step(1, { kind: "stop", tool: null, target: null, text: "" }), step(2, { tool: "Edit", target: "y.py" })]);
    expect(agentLine(a)).toBe("Edit y.py");
    expect(agentLine(agent("a", [], "done"))).toBe("Finished");
  });
});

describe("stale banner", () => {
  const card = (id: string, ws: string | null, session = "cc-1") =>
    ({ id, workstream_id: ws, session_link: { session, branch: null, pr_repo: null, pr_number: null } }) as ProjectCard;
  const projects = [
    { slug: "chat", title: "Chat service", workstreams: [{ id: "w1", title: "5a. Alive" }, { id: "w2", title: "6. Voice" }] },
  ] as unknown as Project[];
  const cards = [card("item:1", "w1"), card("item:2", "w1", "cc-2"), card("item:3", "w2"), card("item:4", null)];

  it("groups stale cards by step, most first, with or without the item prefix", () => {
    expect(staleSteps(["item:1", "2", "item:3", "item:4", "item:gone"], cards, projects)).toEqual([
      { slug: "chat", project: "Chat service", step: "5a. Alive", count: 2 },
      { slug: "chat", project: "Chat service", step: "6. Voice", count: 1 },
    ]);
    expect(staleSteps(["item:1"], null, projects)).toEqual([]);
  });

  it("names each stale card's session once", () => {
    expect(staleSessions(["item:1", "item:2", "item:3"], cards)).toEqual(["cc-1", "cc-2"]);
    expect(listSome(["a", "b", "c", "d", "e"])).toBe("a, b, c and 2 more");
    expect(listSome(["a", "b"])).toBe("a and b");
  });
});

describe("reading the command's session fields", () => {
  it("reads both as absent from a Sazed before slice 3", () => {
    expect(readSessionFields({})).toEqual({ sessions: undefined, session_health: undefined });
  });

  it("drops malformed rows and keeps good ones", () => {
    const good = session("s");
    const out = readSessionFields({ sessions: [good, null, { session_id: 3 }], session_health: { stale_card_ids: ["item:1", 2] } });
    expect(out.sessions).toEqual([good]);
    expect(out.session_health?.stale_card_ids).toEqual(["item:1"]);
    expect(readSessionFields({ sessions: "nope", session_health: { stale_card_ids: null } })).toEqual({
      sessions: undefined,
      session_health: undefined,
    });
  });
});
