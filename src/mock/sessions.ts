import type { ProjectCard } from "@/api/projects";
import type { Session, SessionAgent, SessionDetail, SessionHealth, SessionStep } from "@/api/sessions";

// Fixtures in the slice 3 contract's shape, served in dev when localStorage "sazed-mock-sessions"
// is "1" (src/api/sessions.ts). One of each case the console draws: running with agents, a
// question, idle, not heard from, no card, and stale "being built" cards.

const iso = (secondsAgo: number) => new Date(Date.now() - secondsAgo * 1000).toISOString();

function session(id: string, over: Partial<Session>): Session {
  return {
    session_id: id,
    host: "laptop",
    cwd: "/home/p/code/sazed",
    repo: "tharpep/sazed",
    branch: null,
    started_at: iso(3 * 3600),
    last_heard_at: iso(40),
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

const RUNNING = "7c0e5a7e-2b1f-4f57-9a43-3d0f2f1a9c11";
const ASKING = "1f9b2c44-8d0e-4c1a-9e55-0b7d6a3f2e10";
const IDLE = "a3d4e5f6-1111-4c2b-8a90-55aa66bb77cc";
const QUIET = "b8c9d0e1-2222-4d3c-9b01-66bb77cc88dd";
const LOOSE = "c0ffee00-3333-4e4d-8c12-77cc88dd99ee";

function card(id: string, title: string) {
  return { id: `item:${id}`, title, stage: "doing", next: "Being built in a terminal session" };
}

export function mockSessions(): Session[] {
  return [
    session(RUNNING, {
      role: "orchestrator",
      branch: "feature/registry",
      doing: "Task 4 of 6: worker side of the registry",
      doing_source: "task",
      doing_at: iso(60),
      link: { status: "branch", card_id: "item:4b1e0000-0000-4000-8000-000000000001", candidates: [] },
      card: card("4b1e0000-0000-4000-8000-000000000001", "One profile registry and one run-state vocabulary"),
      project: { slug: "agent-stack", title: "Agent stack" },
    }),
    session(ASKING, {
      host: "wsl",
      repo: "tharpep/sazed-frontend",
      branch: "feature/see-the-work-slice-3",
      started_at: iso(50 * 60),
      last_heard_at: iso(12),
      doing: "Show live sessions on the board",
      doing_source: "commit",
      question: { text: "Allow Bash: pnpm build?", agent_id: null, asked_at: iso(15) },
      link: { status: "card_id", card_id: "item:4b1e0000-0000-4000-8000-000000000002", candidates: [] },
      card: card("4b1e0000-0000-4000-8000-000000000002", "Session events on the board"),
      project: { slug: "the-board", title: "The board" },
    }),
    session(QUIET, {
      host: "ct113",
      branch: "feature/plan-states",
      last_heard_at: iso(25 * 60),
      status: "not_heard_from",
      doing: "Write migration 040",
      doing_source: "task",
      link: { status: "branch", card_id: "item:4b1e0000-0000-4000-8000-000000000003", candidates: [] },
      card: card("4b1e0000-0000-4000-8000-000000000003", "Plan approved, ready, started"),
      project: { slug: "the-board", title: "The board" },
    }),
    session(LOOSE, {
      repo: "tharpep/chat-service",
      branch: "fix/setting-cache",
      started_at: iso(20 * 60),
      last_heard_at: iso(5),
      doing: "Fix the chat-service setting cache",
      doing_source: "task",
    }),
    session(IDLE, {
      host: "laptop",
      branch: "main",
      started_at: iso(5 * 3600),
      last_heard_at: iso(2 * 3600),
      state: "idle",
      status: "idle",
      doing: "Open the PR",
      doing_source: "pr",
      link: { status: "ambiguous", card_id: null, candidates: ["item:a", "item:b"] },
    }),
  ];
}

function planCard(n: number, title: string, section: string): ProjectCard {
  return {
    id: `item:5c2f0000-0000-4000-8000-00000000000${n}`,
    kind: "item",
    source: "backlog",
    title,
    stage: "next",
    next: "Plan to approve",
    updated_at: iso(n * 3600),
    done_at: null,
    session_link: null,
    pr: null,
    repo: "sazed-worker",
    item_type: "planned",
    effort: null,
    impact: null,
    rank: n,
    workstream_id: "agent-stack-ws6",
    actions: [],
    job_id: null,
    job_status: null,
    ci_state: null,
    fix_count: null,
    pr_number: null,
    pr_url: null,
    pr_draft: null,
    plan_id: "plan-p17",
    plan_section: section,
    plan_version: 11,
    plan_approval: null,
    started: null,
  };
}

/** Slice 4's keys on the command: four plans to approve, so Waiting shows three and "1 more". */
export function mockPlanFields(): { plans_to_approve: ProjectCard[]; ready_to_start: number } {
  return {
    plans_to_approve: [
      planCard(1, "Dispatch launches agents through the worker's adapter contract", "seam-2"),
      planCard(2, "Stuck detection fires on a dispatch task", "seam-3"),
      planCard(3, "A dispatch run shows its profile and adapter", "seam-3"),
      planCard(4, "Jobs and dispatch share one run-state word list", "seam-4"),
    ],
    ready_to_start: 2,
  };
}

export function mockSessionFields(): { sessions: Session[]; session_health: SessionHealth } & ReturnType<typeof mockPlanFields> {
  return {
    ...mockPlanFields(),
    sessions: mockSessions(),
    session_health: {
      silent_after_s: 900,
      idle_silent_after_s: 86400,
      last_heard_at: iso(5),
      stale_card_ids: ["item:card-3", "item:card-9", "item:card-14"],
    },
  };
}

const TOOLS: [string, string, string][] = [
  ["Read", "worker/profiles.py", ""],
  ["Edit", "worker/profiles.py", "+31 -4"],
  ["Bash", "pytest tests/test_profiles.py -q", "12 passed"],
  ["Edit", "worker/adapters/claude.py", "+18 -2"],
  ["Bash", "ruff check .", "clean"],
  ["Grep", "run_state", "14 matches"],
];

function steps(n: number, endSecondsAgo: number): SessionStep[] {
  return Array.from({ length: n }, (_, i) => {
    const [tool, target, text] = TOOLS[i % TOOLS.length];
    const ago = endSecondsAgo + (n - 1 - i) * 45;
    return {
      ts: (Date.now() - ago * 1000) / 1000,
      at: iso(ago),
      seq: 0,
      kind: "tool",
      tool,
      target,
      text: i === 2 && n > 10 ? "1 failed, 11 passed" : text,
      error: i === 2 && n > 10,
    };
  });
}

function agent(id: string | null, type: string, state: string, n: number, end: number): SessionAgent {
  const s = steps(n, end);
  return { agent_id: id, agent_type: type, state, first_at: s[0]?.at ?? null, last_at: s[s.length - 1]?.at ?? null, steps: s };
}

export function mockSessionDetail(id: string): SessionDetail | null {
  const base = mockSessions().find((s) => s.session_id === id);
  if (!base) return null;
  const agents =
    id === RUNNING
      ? [
          agent(null, "main", "running", 30, 40),
          agent("a8f2", "Explore", "done", 6, 1800),
          agent("b311", "Implement", "running", 20, 40),
          agent("c470", "Test", "running", 0, 40),
        ]
      : [agent(null, "main", base.state, 9, 60)];
  return { ...base, agents, steps_per_agent: 80, silent_after_s: 900, idle_silent_after_s: 86400, now: iso(0) };
}
