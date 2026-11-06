import type {
  BoardProgress,
  CardStage,
  Project,
  ProjectCard,
  Workstream,
  WorkstreamStatus,
} from "@/api/projects";

const NOW = Date.now();
const ago = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();

type CardSpec = [title: string, stage: CardStage, next?: string, pr?: number];
type WsSpec = [title: string, status: WorkstreamStatus, summary: string, cards: CardSpec[], dependsOn?: string[]];

let seq = 0;
function card(spec: CardSpec, repo: string, workstream: string): ProjectCard {
  const [title, stage, next = "", pr] = spec;
  seq += 1;
  return {
    id: `card-${seq}`,
    kind: pr ? "job" : "item",
    source: pr ? "worker" : "manual",
    title,
    stage,
    next,
    updated_at: ago(seq * 3),
    repo,
    item_type: "task",
    effort: null,
    impact: null,
    rank: null,
    workstream_id: workstream,
    actions: [],
    job_id: pr ? `job-${seq}` : null,
    job_status: pr ? "done" : null,
    ci_state: pr ? "success" : null,
    fix_count: pr ? 0 : null,
    pr_number: pr ?? null,
    pr_url: pr ? `https://github.com/pryce/${repo}/pull/${pr}` : null,
    pr_draft: pr ? false : null,
  };
}

function progressOf(cards: ProjectCard[]): BoardProgress {
  const n = (stage: CardStage) => cards.filter((c) => c.stage === stage).length;
  const done = n("done");
  const in_flight = n("doing");
  const needs_me = n("needs_me");
  const next = n("next");
  return { done, in_flight, needs_me, next, ideas: n("inbox"), total: done + in_flight + needs_me + next };
}

function sum(parts: BoardProgress[]): BoardProgress {
  const add = (k: keyof BoardProgress) => parts.reduce((a, p) => a + p[k], 0);
  return {
    done: add("done"),
    in_flight: add("in_flight"),
    needs_me: add("needs_me"),
    next: add("next"),
    ideas: add("ideas"),
    total: add("total"),
  };
}

function build(
  slug: string,
  title: string,
  repo: string,
  headline: string,
  latest: string | null,
  specs: WsSpec[]
): Project {
  const workstreams: Workstream[] = specs.map(([wsTitle, status, summary, cards, dependsOn], i) => {
    const id = `${slug}-ws${i + 1}`;
    const built = cards.map((c) => card(c, repo, id));
    return {
      id,
      title: wsTitle,
      summary,
      position: i + 1,
      state: status === "done" ? "done" : status === "dropped" ? "dropped" : "open",
      status,
      depends_on: dependsOn ?? [],
      progress: progressOf(built),
      cards: built,
    };
  });
  const open = workstreams.find((w) => w.state === "open");
  return {
    id: `proj-${slug}`,
    slug,
    title,
    summary: headline,
    state: "active",
    rank: null,
    repos: [repo],
    plan: null,
    latest_update: latest,
    latest_update_at: latest ? ago(5) : null,
    updated_at: ago(2),
    headline,
    progress: sum(workstreams.map((w) => w.progress)),
    steps_done: workstreams.filter((w) => w.status === "done").length,
    steps_total: workstreams.length,
    current: open ? { id: open.id, title: open.title, status: open.status } : null,
    workstreams,
  };
}

const FIXTURES: Project[] = [
  build(
    "agent-stack",
    "Agent stack",
    "ai-context",
    "Learning v1 is done. The router is next.",
    "Learning v1 shipped today. Next is the router, which starts with a spike on who may originate work.",
    [
      ["Shared contracts", "done", "Schemas every service shares.", [["Event envelope", "done", "", 31], ["Originator field", "done", "", 33], ["Contract tests", "done", "", 34]]],
      ["Check service", "done", "Runs the repo's CI locally before a PR.", [["Check runner", "done", "", 36], ["Result schema", "done", "", 37]]],
      ["Bake-offs", "done", "Compare models on the same task.", [["Bake-off runner", "done", "", 39], ["Scoring", "done"], ["Promote winner", "done"], ["Report page", "done"]]],
      ["Learning v1", "done", "Write results back as learnings.", [["Learning store", "done", "", 41], ["Guard queue", "done"]]],
      ["Router + thread map", "next", "Pick who handles each event.", [["Spike: who may originate work", "next", "Read the webhook sources and list them"], ["Allowed-originator rule in /events", "next", "Reject events from unknown sources"], ["Thread map", "next", "Map events to open threads"]]],
      ["Advisor + watchdog", "blocked", "A second opinion and a stuck-job alarm.", [["Advisor call", "inbox"], ["Watchdog timer", "inbox"]], ["Router + thread map"]],
      ["Views", "planned", "Console and Kelsier views of threads.", [["Thread list view", "inbox"]]],
    ]
  ),
  build(
    "sazed-chat",
    "Sazed chat",
    "sazed",
    "Two cache fixes are live. The engine choice is waiting on you.",
    null,
    [
      ["Prompt cache, round 1", "done", "Stop re-sending the system prompt.", [["Cache the tool list", "done", "", 174], ["Cache the system prompt", "done", "", 175]]],
      ["Prompt cache, round 2", "needs_me", "Measure misses first.", [["Measure cache misses in llm_calls", "needs_me", "Pick the window to measure over"], ["Trim the memory block", "next", "Wait for the measurement"]]],
      ["Chat engine choice", "planned", "API, claude -p, or OpenCode.", [["Cost comparison", "inbox"]]],
      ["Console chat redesign", "planned", "Mockups first.", [["Chat mockups", "inbox"]]],
    ]
  ),
  build(
    "the-board",
    "The board",
    "sazed",
    "The read-only API is live. Projects are being built now.",
    "Projects and workstreams are being designed now.",
    [
      ["Read-only API", "done", "Cards from the backlog and jobs.", [["Board endpoint", "done", "", 51], ["Card stages", "done", "", 52]]],
      ["Projects layer", "in_flight", "Projects and ordered workstreams.", [["Projects API", "doing", "Open the PR", 58], ["Projects page", "doing", "Check on a phone"], ["Gateway tools", "next", "After the API lands"]]],
      ["Life management", "planned", "Grow the board past code work.", [["Home and errands", "inbox"]]],
    ]
  ),
  build(
    "homelab-move",
    "Homelab move",
    "homelab",
    "GCP and Neon still serve the clients. Secrets and data are not on the homelab copy yet.",
    null,
    [
      ["Container map", "done", "What runs where on Proxmox.", [["List containers", "done"], ["Name services", "done"], ["Tailscale routes", "done"]]],
      ["Secrets", "needs_me", "Copy keys to the homelab.", [["Choose a secret store", "needs_me", "Decide where keys live"]]],
      ["Data copy", "planned", "Postgres and files.", [["Dump from Neon", "next"], ["Restore on CT 110", "next"]]],
      ["Switch clients", "planned", "Point apps at the homelab.", [["Console URL", "inbox"]]],
    ]
  ),
  build(
    "vault",
    "Vault",
    "ai-context",
    "Phase 1 is done. The bridge and service are next.",
    "Plan 05 phase 1 is done. The bridge and service (phases 2 and 3) are next.",
    [
      ["Notes layout", "done", "Captures, his notes, the AI layer.", [["Folder layout", "done", "", 12]]],
      ["Bridge", "next", "Sync the vault with the gateway.", [["Sync spike", "next", "Try the Obsidian CLI"], ["Merge state", "next"]]],
      ["Service", "planned", "A gateway MCP for the vault.", [["Read tool", "inbox"]]],
      ["Nightly gardener", "planned", "An agent tidies the AI layer.", [["Gardener job", "inbox"]]],
    ]
  ),
];

export function mockProjects(): Project[] {
  return FIXTURES.map((p) => ({
    ...p,
    workstreams: p.workstreams.map(({ cards: _cards, ...rest }) => rest),
  }));
}

export function mockProject(slug: string): Project | null {
  return FIXTURES.find((p) => p.slug === slug) ?? null;
}
