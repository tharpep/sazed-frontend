import type { DispatchCardTask, DispatchRunView } from "@/api/dispatch";

const NOW = "2026-11-26T14:30:00+00:00";
const at = (secondsAgo: number) => new Date(Date.parse(NOW) - secondsAgo * 1000).toISOString();
const OPEN = (plan: string) => `https://sazed.tail77c590.ts.net/?open=dispatch:${plan}`;

function row(state: string, phase: string, line: string, secondsAgo: number) {
  return { state, phase, line, received_at: at(secondsAgo) };
}

/** The H mockup's run: two landed, two working, one asking, one planned. */
export const dispatchRunning: DispatchRunView = {
  plan: "one-stack-seam-5",
  repo: "tharpep/sazed",
  tasks_total: 6,
  updated_at: at(12),
  now: NOW,
  last_heard_at: at(12),
  tasks: [
    { id: "t1", goal: "Run row carries failure_class", depends_on: [], latest: row("succeeded", "landed", "landed on integ/one-stack-seam-5", 1800), tools: 14 },
    { id: "t2", goal: "Ledger reads dispatch rows", depends_on: ["t1"], latest: row("succeeded", "landed", "landed on integ/one-stack-seam-5", 1500), tools: 22 },
    { id: "t3", goal: "Guard proposal from repeated lessons", depends_on: ["t2"], latest: row("running", "running", "editing", 12), step: "Edit: app/learning/guards.py", tools: 31, elapsed_s: 720 },
    { id: "t4", goal: "Console shows failure classes", depends_on: ["t1"], latest: row("running", "running", "testing", 40), step: "Bash: pnpm test projectWork", tools: 18, elapsed_s: 480 },
    { id: "t5", goal: "Backfill old runs", depends_on: ["t1"], latest: row("needs_input", "waiting", "Backfill all runs or the last 30 days?", 300), tools: 6 },
    { id: "t6", goal: "Docs: learning v2 section", depends_on: ["t3", "t4"], latest: null },
  ],
  open_url: OPEN("one-stack-seam-5"),
};

/** A plan with no task rows yet. */
export const dispatchEmpty: DispatchRunView = {
  plan: "notes4-console-v1",
  repo: "tharpep/sazed-frontend",
  tasks_total: 0,
  now: NOW,
  tasks: [],
  open_url: OPEN("notes4-console-v1"),
};

/** Paused on a question: the asking task's text is long, as an agent's question can be. */
export const dispatchAsking: DispatchRunView = {
  ...dispatchRunning,
  plan: "registry-v2",
  last_heard_at: at(95),
  tasks: [
    { id: "t1", goal: "Profiles registry table and migration", depends_on: [], latest: row("succeeded", "landed", "landed on integ/registry-v2", 4000) },
    {
      id: "t2",
      goal: "Edit form for a profile",
      depends_on: ["t1"],
      latest: row("needs_input", "waiting", "asked", 95),
      question:
        "The DESIGN.md form rules say every field gets a label above it, but the existing ProfileForm puts labels to the left on desktop. Should the new registry form follow DESIGN.md and move ProfileForm's labels above too, or match ProfileForm and leave DESIGN.md's rule for a later pass? Moving ProfileForm touches four files and its tests; matching it keeps this task inside its own files. ".repeat(3).trim(),
    },
    { id: "t3", goal: "History list with read-only versions", depends_on: ["t1"], latest: row("needs_input", "waiting", "Show deleted versions in the history list?", 400) },
    { id: "t4", goal: "Delete with a reason", depends_on: ["t2"], latest: null },
  ],
  tasks_total: 4,
  open_url: OPEN("registry-v2"),
};

/** Live GET /dispatch/plans/seam2-smoke on 2026-11-27, trimmed as dispatch_status trims it. */
export const dispatchFailed: DispatchRunView = {
  plan: "seam2-smoke",
  repo: "tharpep/dispatch-sandbox",
  tasks_total: 1,
  updated_at: "2026-11-19T21:04:27.403214+00:00",
  now: "2026-11-27T03:24:07.794097+00:00",
  last_heard_at: "2026-11-19T21:04:27.403214+00:00",
  tasks: [
    {
      id: "c2f",
      goal: "Add a function c_to_f(celsius: float) -> float to temps/convert.py that converts Celsius to Fahrenheit, and a unittest f",
      depends_on: [],
      latest: { state: "failed", phase: "failed", line: "finished without a done or waiting result", received_at: "2026-11-19T21:04:27.403214+00:00" },
      tools: 0,
    },
  ],
  open_url: OPEN("seam2-smoke"),
};

/** Live GET /dispatch/plans/notes-console-v1 on 2026-11-27, a settled plan, trimmed. */
export const dispatchFinished: DispatchRunView = {
  plan: "notes-console-v1",
  repo: "tharpep/sazed-frontend",
  tasks_total: 3,
  updated_at: "2026-11-22T21:56:50.116268+00:00",
  now: "2026-11-27T03:23:51.710271+00:00",
  last_heard_at: "2026-11-22T22:23:09.244011+00:00",
  tasks: [
    {
      id: "format",
      goal: "Add src/features/notes/format.ts: pure helpers for a notes card wall, built on the `Note` type in src/api/notes.ts (do n",
      depends_on: [],
      latest: { state: "succeeded", phase: "landed", line: "landed on integ/notes-console-v1", received_at: "2026-11-22T22:04:38.728217+00:00" },
      step: "StructuredOutput: done",
      tools: 4,
    },
    {
      id: "dictation",
      goal: "Add a push-to-talk dictation hook for a text box.",
      depends_on: [],
      latest: { state: "succeeded", phase: "landed", line: "landed on integ/notes-console-v1", received_at: "2026-11-22T22:06:57.823477+00:00" },
      step: "StructuredOutput: done",
      tools: 4,
    },
    {
      id: "page",
      goal: "Build the Notes view of the web console.",
      depends_on: ["format", "dictation"],
      latest: { state: "succeeded", phase: "landed", line: "landed on integ/notes-console-v1", received_at: "2026-11-22T22:23:09.244011+00:00" },
      step: "StructuredOutput: done",
      tools: 20,
    },
  ],
  open_url: OPEN("notes-console-v1"),
};

function bigTask(i: number): DispatchCardTask {
  const id = `t${i + 1}`;
  const goal = `Task ${i + 1}: ${"a long goal that the gateway already cut ".repeat(4)}`.slice(0, 120);
  if (i < 22) return { id, goal, depends_on: [], latest: row("succeeded", "landed", "landed", 3000 - i) };
  if (i < 30) return { id, goal, depends_on: [], latest: row("running", "running", "working", 20 + i), step: `Bash: pnpm test ${"src/features/very/long/path/".repeat(4)}`, elapsed_s: 300 + i * 60 };
  if (i < 32) return { id, goal, depends_on: [], latest: row("needs_input", "waiting", "Which of the two shapes should the API return?", 60) };
  if (i < 34) return { id, goal, depends_on: [], latest: row("failed", "conflict", "merge conflict in src/api/client.ts", 90) };
  if (i < 36) return { id, goal, depends_on: [], latest: row("succeeded", "done", "done, waiting to land", 30) };
  return { id, goal, depends_on: ["t23", "t24", "t25", "t26", "t27"], latest: null };
}

/** Forty tasks: every square wraps, and lists cut to their top rows. */
export const dispatchOversized: DispatchRunView = {
  plan: "obscura-swarm-40-tasks-with-a-long-plan-name",
  repo: "tharpep/obscura",
  tasks_total: 40,
  now: NOW,
  last_heard_at: at(4),
  tasks: Array.from({ length: 40 }, (_, i) => bigTask(i)),
  open_url: OPEN("obscura-swarm"),
};
