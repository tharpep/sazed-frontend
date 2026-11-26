import type { NeedsYouItem, NeedsYouView, PullRequestView } from "@/api/command";
import type { PrSnapshot } from "@/api/projects";

const MERGES: [string, number, string, number, number, number, string | null][] = [
  ["sazed", 214, "feat(board): plan states and the orchestrator column", 6, 412, 88, null],
  ["sazed-frontend", 86, "feat(home): Needs you groups merge calls by review", 9, 236, 41, null],
  ["api-gateway", 54, "fix(mcp): card schema that the summary shape satisfies", 5, 118, 22, "approve"],
  ["sazed-worker", 43, "feat(dispatch): check_result from the jail run", 7, 301, 64, null],
  ["ai-context", 61, "chore(hooks): board-brief reads /board/command", 3, 44, 19, null],
  ["sazed", 215, "fix(dispatch): failure class on task rows", 6, 97, 12, "approve_with_nits"],
  ["sazed-frontend", 87, "feat(cards): meters for storage and container", 9, 188, 63, null],
  ["api-gateway", 55, "chore: keep job result out of structuredContent", 5, 21, 9, null],
  ["sazed", 216, "test(board): stage rules for merge calls", 6, 140, 0, null],
  ["sazed-worker", 44, "fix(worker): heartbeat after resume", 7, 33, 8, null],
  ["ai-context", 62, "docs(rules): comment gate scope", 3, 26, 30, null],
  ["sazed-frontend", 88, "fix(projects): step track legend wraps on phone", 9, 14, 6, null],
  ["knowledge-base", 31, "chore(ci): pin pgvector image", 4, 3, 3, null],
  ["sazed", 217, "feat(learning): dispatch failures feed the ledger", 6, 256, 31, null],
];

function mergeItem([repo, number, title, checks, additions, deletions, verdict]: (typeof MERGES)[number], i: number): NeedsYouItem {
  return {
    id: `item:00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    kind: "item",
    title,
    repo: `tharpep/${repo}`,
    next: "Merge it",
    question: null,
    stage: "needs_me",
    job_id: null,
    job_status: null,
    updated_at: "2026-11-25T09:30:00+00:00",
    pr: {
      repo: `tharpep/${repo}`,
      number,
      url: `https://github.com/tharpep/${repo}/pull/${number}`,
      state: "open",
      checks: { state: "passing", passed: checks, total: checks },
      review: verdict ? { verdict } : null,
      additions,
      deletions,
    },
  };
}

const QUESTION: NeedsYouItem = {
  id: "dispatch:one-stack-seam-3:run_check",
  kind: "dispatch",
  title: "Dispatch one-stack-seam-3",
  repo: "tharpep/sazed-worker",
  next: "run_check",
  question: "Install test deps before the jail starts, or fail the check?",
  updated_at: "2026-11-25T10:41:00+00:00",
};

const OPEN_HOME = "https://sazed.tail77c590.ts.net/?page=home";

/** The H mockup's data: one question, 14 merge calls, two running. */
export const needsYouReal: NeedsYouView = {
  needs: [QUESTION, ...MERGES.map(mergeItem)],
  needs_total: 15,
  working: [
    { kind: "dispatch", title: "seam-3 run_check", elapsed_s: 49 * 60 },
    { kind: "dispatch", title: "registry task 4", elapsed_s: 3 * 3600 + 50 * 60 },
  ],
  done: { succeeded: 6, failed: 0, window_hours: 24 },
  session_count: 0,
  open_url: OPEN_HOME,
};

/** Live GET /board/command on 2026-11-25, trimmed as board_command trims it. */
export const needsYouEmpty: NeedsYouView = {
  needs: [],
  needs_total: 0,
  working: [],
  done: { succeeded: 2, failed: 0, window_hours: 24 },
  session_count: 0,
  open_url: OPEN_HOME,
};

const LONG_TITLE = `feat(board): ${"a very long merge call title that keeps going ".repeat(7)}`.slice(0, 300);

/** 300-character titles and a 5,000-character question. */
export const needsYouLong: NeedsYouView = {
  ...needsYouReal,
  needs: [
    { ...QUESTION, question: `Which way should the jail install test deps? ${"Option detail that runs on and on. ".repeat(160)}`.slice(0, 5000) },
    { ...QUESTION, id: "dispatch:p:t2", title: LONG_TITLE, question: "A second question waits behind the first." },
    ...MERGES.slice(0, 5).map((m, i) => ({ ...mergeItem(m, i), title: LONG_TITLE })),
  ],
  needs_total: 7,
  working: [{ kind: "job", title: LONG_TITLE, elapsed_s: 26 * 3600 }],
  session_count: 3,
};

/** More than the card shows: 50 needs sent of 64, many other items, many running. */
export const needsYouOversized: NeedsYouView = {
  needs: [
    QUESTION,
    ...Array.from({ length: 6 }, (_, i): NeedsYouItem => ({
      id: `item:other-${i}`,
      kind: "job",
      title: `Worker job ${i + 1} failed on its last run`,
      repo: "tharpep/sazed",
      next: "Look at the failure",
      question: null,
      stage: "needs_me",
      job_id: `job-${i}`,
      job_status: "failed",
    })),
    ...Array.from({ length: 43 }, (_, i) => mergeItem(MERGES[i % MERGES.length], i)),
  ],
  needs_total: 64,
  working: Array.from({ length: 9 }, (_, i) => ({ kind: "job" as const, title: `Job ${i + 1}`, elapsed_s: 600 * i })),
  done: { succeeded: 31, failed: 4, window_hours: 24 },
  session_count: 5,
  open_url: OPEN_HOME,
};

const RUNS = ["ruff", "pytest (3.12)", "pytest (3.13)", "mypy", "docker build", "agy review"];

const OPEN_PR: PrSnapshot = {
  repo: "tharpep/sazed",
  number: 214,
  url: "https://github.com/tharpep/sazed/pull/214",
  state: "open",
  checks: { state: "passing", passed: 6, total: 6, runs: RUNS.map((name) => ({ name, conclusion: "success" })) },
  review: null,
  additions: 412,
  deletions: 88,
  merged_at: null,
  fetched_at: null,
};

const CARD: Omit<PullRequestView, "pr"> = {
  id: "item:0f3c5a1e-7d2b-4c8e-9a61-2b7e4d9c1f00",
  title: "feat(board): plan states and the orchestrator column",
  stage: "needs_me",
  next: "Merge it",
  repo: "tharpep/sazed",
  job_id: null,
  job_status: null,
  open_url: "https://sazed.tail77c590.ts.net/?open=backlog:0f3c5a1e-7d2b-4c8e-9a61-2b7e4d9c1f00",
};

/** The H mockup's PR: open, 6 of 6 checks, no review. */
export const prReal: PullRequestView = { ...CARD, pr: OPEN_PR };

export const prFailing: PullRequestView = {
  ...CARD,
  stage: "doing",
  pr: {
    ...OPEN_PR,
    checks: {
      state: "failing",
      passed: 4,
      total: 6,
      runs: RUNS.map((name, i) => ({ name, conclusion: i === 2 ? "failure" : i === 4 ? "cancelled" : "success" })),
    },
  },
};

/** Live GET /board/item:28388972-... on 2026-11-25 (chat-service#158). */
export const prMerged: PullRequestView = {
  id: "item:28388972-97c9-489c-90a2-e9f22d65ba9f",
  title: "Nothing from play is ever kept for good when a resident sleeps",
  stage: "done",
  next: "Done",
  repo: null,
  job_id: null,
  job_status: null,
  pr: {
    repo: "tharpep/chat-service",
    number: 158,
    url: "https://github.com/tharpep/chat-service/pull/158",
    state: "merged",
    checks: { runs: [{ name: "Pull Request Checks", conclusion: "success" }], state: "passing", total: 1, passed: 1 },
    review: null,
    additions: 1155,
    deletions: 555,
    merged_at: "2026-11-25T19:32:10+00:00",
    fetched_at: "2026-11-25T20:00:25.022418+00:00",
  },
  open_url: "https://sazed.tail77c590.ts.net/?open=backlog:28388972-97c9-489c-90a2-e9f22d65ba9f",
};

export const prClosed: PullRequestView = { ...CARD, stage: "doing", pr: { ...OPEN_PR, state: "closed", review: { verdict: "request_changes", source: "agy", url: OPEN_PR.url } } };

export const prNoChecks: PullRequestView = { ...CARD, stage: "doing", pr: { ...OPEN_PR, checks: null } };

export const prReviewed: PullRequestView = { ...CARD, pr: { ...OPEN_PR, review: { verdict: "approve_with_nits", source: "agy", url: OPEN_PR.url } } };

export const prNoRuns: PullRequestView = { ...CARD, stage: "doing", pr: { ...OPEN_PR, checks: { state: "none", passed: 0, total: 0, runs: [] } } };

/** A board card with no PR, which is most of them. */
export const prNone: PullRequestView = {
  ...CARD,
  title: "Claude cards redesign: hybrid H for 13 cards",
  stage: "doing",
  next: "Build F1: tokens, primitives, Needs you and Pull request cards",
  job_status: "running",
  pr: null,
};

export const prLong: PullRequestView = {
  ...CARD,
  title: LONG_TITLE,
  repo: "tharpep/a-repository-with-a-long-name-for-wrapping",
  pr: { ...OPEN_PR, repo: "tharpep/a-repository-with-a-long-name-for-wrapping", number: 123456, review: { verdict: "approve", source: "x".repeat(120), url: OPEN_PR.url } },
};

/** Twenty runs, the cap board_card sends, and a diff past the full bar. */
export const prOversized: PullRequestView = {
  ...CARD,
  stage: "doing",
  pr: {
    ...OPEN_PR,
    checks: {
      state: "running",
      passed: 15,
      total: 20,
      runs: Array.from({ length: 20 }, (_, i) => ({ name: `check ${i + 1}`, conclusion: i < 15 ? "success" : i < 17 ? "failure" : null })),
    },
    additions: 12480,
    deletions: 3311,
  },
};
