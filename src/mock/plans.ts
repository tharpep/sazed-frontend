import type { Plan, PlanDiff, PlanSection, PlanSectionCard, PlanState, PlanSummary, PlanVersion } from "@/api/plans";
import type { CardStage, ProjectCard } from "@/api/projects";

const NOW = Date.now();
const ago = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();

let seq = 0;
function card(
  title: string,
  stage: CardStage,
  next: string,
  plan: string,
  section: string,
  filedFrom: number,
  pr?: number
): ProjectCard {
  seq += 1;
  return {
    id: `plan-card-${seq}`,
    kind: pr ? "job" : "item",
    source: pr ? "worker" : "manual",
    title,
    stage,
    next,
    updated_at: ago(seq),
    repo: "sazed-worker",
    item_type: "task",
    effort: null,
    impact: null,
    rank: null,
    workstream_id: null,
    actions: [],
    job_id: pr ? `job-${seq}` : null,
    job_status: pr ? "done" : null,
    ci_state: pr ? "success" : null,
    fix_count: pr ? 0 : null,
    pr_number: pr ?? null,
    pr_url: pr ? `https://github.com/pryce/sazed-worker/pull/${pr}` : null,
    pr_draft: pr ? false : null,
    plan_id: plan,
    plan_section: section,
    plan_version: filedFrom,
  };
}

interface Fixture {
  summary: PlanSummary;
  versions: PlanVersion[];
  preamble: string;
  sections: Omit<PlanSection, "cards">[];
  cards: (section: string) => PlanSectionCard[];
  unlinked: ProjectCard[];
}

function summary(
  id: string,
  slug: string,
  title: string,
  state: PlanState,
  project: [string, string] | null,
  versions: PlanVersion[],
  cards: [number, number, number],
  stale = false
): PlanSummary {
  const last = versions[0];
  return {
    id,
    slug,
    title,
    state,
    project: project?.[0] ?? null,
    project_title: project?.[1] ?? null,
    workstream_id: null,
    version: last.version,
    last_author: last.author,
    last_reason: last.reason,
    last_saved_at: last.created_at,
    cards_total: cards[0],
    cards_done: cards[1],
    cards_moved_since: cards[2],
    stale,
  };
}

const v = (version: number, author: string, reason: string, hours: number): PlanVersion => ({
  version,
  author,
  reason,
  created_at: ago(hours),
  chars: 2400 + version * 120,
});

const DISPATCH_VERSIONS = [
  v(6, "agent:claude", "D3 done in #25; D4 next", 2),
  v(5, "agent:claude", "D2 done in #24", 3),
  v(4, "agent:claude", "D0 findings change D1: deny rules work here", 5),
  v(3, "pryce", "Runs on CT 108 or WSL; runner field per plan", 6),
  v(2, "dispatch:plan-check", "Added the owns field to every task", 7),
  v(1, "agent:claude", "First draft from dispatch.md", 8),
];

const ROUTER_VERSIONS = [
  v(4, "agent:claude", "R1 to R3 live", 26),
  v(3, "agent:claude", "R3 moved to plan 17; R4 is the handoff", 40),
  v(2, "pryce", "Thread map owns the comment rule", 70),
  v(1, "agent:claude", "First draft", 96),
];

const BOARD_VERSIONS = [v(2, "agent:claude", "Research and data model", 0.2), v(1, "agent:claude", "Outline", 1)];
const VAULT_VERSIONS = [v(12, "pryce", "Regrounded on plan 06", 430), v(11, "agent:claude", "Phase 1 done", 520)];

const DISPATCH: Fixture = {
  summary: summary(
    "17",
    "dispatch-the-graph-engine",
    "Dispatch, the graph engine",
    "active",
    ["agent-stack", "Agent stack"],
    DISPATCH_VERSIONS,
    [2, 1, 1]
  ),
  versions: DISPATCH_VERSIONS,
  preamble:
    "Status: started 2026-11-07. D0 done (sazed-worker #22). D1 done in #23. D2 done in #24. D3 done in #25 (engine, fake-agent tested). D4, one real run, next.",
  sections: [
    {
      id: "goal",
      title: "Goal {#goal}",
      level: 2,
      text: "One plan becomes parallel `claude -p` tasks, each in its own worktree, landed in order on `integ/<plan>` and opened as one draft PR.",
    },
    {
      id: "where",
      title: "Where it lives {#where}",
      level: 2,
      text: "The engine is a module in **sazed-worker**. It runs on CT 108 or on WSL; each plan names its runner.\n\n- State lives in the board tables, not in the repo.\n- A task that touches files outside its `owns` list is refused.",
    },
    { id: "d0", title: "D0. Probe {#d0}", level: 3, text: "Check the 14 claims about headless `claude -p` before any code. Done." },
    {
      id: "d1",
      title: "D1. Guardrails {#d1}",
      level: 3,
      text: "Deny rules in `--settings`, a per-task timeout, and a cap on parallel tasks. Done.",
    },
    {
      id: "d2",
      title: "D2. Plan and validate {#d2}",
      level: 3,
      text: "Parse the task graph from a plan and reject cycles and overlapping `owns`. Done.",
    },
    {
      id: "d3",
      title: "D3. Engine {#d3}",
      level: 3,
      text: "Worktrees, the agent runner, the board rows and the integrator, tested against a fake agent first.",
    },
    {
      id: "d4",
      title: "D4. One real run {#d4}",
      level: 3,
      text: "Two tasks with disjoint owns on sonnet, in a throwaway repo, 20-minute timeout.",
    },
    { id: "d5", title: "D5. Wire it to the router {#d5}", level: 3, text: "Accepted tickets with a profile start a run." },
  ],
  cards: (section) => {
    if (section === "d3")
      return [
        {
          ...card("Dispatch engine: worktrees, runner, integrator", "done", "landed", "17", "d3", 3, 25),
          section_changed_since_filed: false,
        },
      ];
    if (section === "d4")
      return [
        { ...card("First real dispatch run", "next", "Pick the throwaway repo", "17", "d4", 4), section_changed_since_filed: true },
      ];
    return [];
  },
  unlinked: [card("Document the runner field", "inbox", "", "17", "removed", 2)],
};

const ROUTER: Fixture = {
  summary: summary("16", "the-router", "The router", "done", ["agent-stack", "Agent stack"], ROUTER_VERSIONS, [3, 3, 0]),
  versions: ROUTER_VERSIONS,
  preamble: "Code decides who may start work before any model reads the text.",
  sections: [
    {
      id: "r1",
      title: "R1. Originator rule and trigger log {#r1}",
      level: 2,
      text: "Code decides who may start work before any model reads the text; every event is logged with its decision.",
    },
    {
      id: "r2",
      title: "R2. Thread map {#r2}",
      level: 2,
      text: "A comment on work Sazed owns continues that work; an @sazed mention starts new work that waits for approval.",
    },
    { id: "r4", title: "R4. Dispatch handoff {#r4}", level: 2, text: "Accepted tickets carry a profile and go to dispatch." },
  ],
  cards: (section) => {
    if (section === "r1")
      return [
        { ...card("Allowed-originator rule for /events", "done", "landed", "16", "r1", 2, 180), section_changed_since_filed: false },
      ];
    if (section === "r2")
      return [
        {
          ...card("Event triggers: inbound events that start work", "done", "landed", "16", "r2", 2, 180),
          section_changed_since_filed: false,
        },
      ];
    if (section === "r4")
      return [{ ...card("Dispatch (graph engine)", "doing", "Moved to plan 17", "16", "r4", 2), section_changed_since_filed: true }];
    return [];
  },
  unlinked: [],
};

const EXTRA: Fixture[] = [
  {
    summary: summary("18", "plans-on-the-board", "Plans on the board", "draft", ["the-board", "The board"], BOARD_VERSIONS, [0, 0, 0]),
    versions: BOARD_VERSIONS,
    preamble: "",
    sections: [{ id: "goal", title: "Goal {#goal}", level: 2, text: "Plans become versioned documents on the board." }],
    cards: () => [],
    unlinked: [],
  },
  {
    summary: summary("05", "obsidian-vault", "Obsidian vault", "active", ["vault", "Vault"], VAULT_VERSIONS, [5, 1, 2], true),
    versions: VAULT_VERSIONS,
    preamble: "",
    sections: [{ id: "layout", title: "Notes layout {#layout}", level: 2, text: "Captures, his notes, and the AI layer." }],
    cards: () => [],
    unlinked: [],
  },
];

const FIXTURES: Fixture[] = [DISPATCH, ROUTER, ...EXTRA];

function find(slug: string): Fixture | null {
  return FIXTURES.find((f) => f.summary.slug === slug) ?? null;
}

export function mockPlans(filter: { project?: string; state?: PlanState }): PlanSummary[] {
  return FIXTURES.map((f) => f.summary).filter(
    (p) => (!filter.project || p.project === filter.project) && (!filter.state || p.state === filter.state)
  );
}

export function mockPlan(slug: string, version: number | null): Plan | null {
  const f = find(slug);
  if (!f) return null;
  const shown = version ?? f.summary.version;
  const older = shown < f.summary.version && f === DISPATCH;
  return {
    ...f.summary,
    shown_version: shown,
    body: "",
    preamble: older ? "Status: started 2026-11-07. D0 done (sazed-worker #22). D1 next." : f.preamble,
    sections: f.sections.map((s) => ({
      ...s,
      text: older && s.id === "d3" ? "Worktrees and the agent runner, tested against a fake agent first." : s.text,
      cards: f.cards(s.id),
    })),
    unlinked_cards: f.unlinked,
  };
}

export function mockVersions(slug: string): PlanVersion[] | null {
  return find(slug)?.versions ?? null;
}

export function mockDiff(slug: string, a: number, b: number): PlanDiff | null {
  const f = find(slug);
  const from = f?.versions.find((x) => x.version === a);
  const to = f?.versions.find((x) => x.version === b);
  if (!from || !to) return null;
  return {
    from,
    to,
    blocks: [
      { kind: "same", count: 3, headings: ["Goal", "Where it lives"] },
      {
        kind: "chg",
        segments: [
          { op: "same", text: "Status: started 2026-11-07. D0 done (sazed-worker #22). " },
          { op: "del", text: "D1 next." },
          {
            op: "add",
            text: "D1 done in #23. D2 done in #24. D3 done in #25 (engine, fake-agent tested). D4, one real run, next.",
          },
        ],
      },
      {
        kind: "add",
        text: "D0 findings. All 14 claims hold. Deny rules in --settings are enforced headless; acceptEdits admits only file-edit commands.",
      },
      { kind: "del", text: "Probe the managed-policy claims again before relaxing the hooks." },
      { kind: "same", count: 3, headings: [] },
    ],
  };
}
