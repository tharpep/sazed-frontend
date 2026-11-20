import { describe, expect, it } from "vitest";

import type { PrSnapshot } from "@/api/projects";

import { diffSize, mergeCallLine, oldSnapshotText, proofLines, snapshotAge } from "./proof";

const NOW = Date.parse("2026-11-19T21:00:00+00:00");

// The shape sazed#209's tests send for a merged, reviewed PR.
const merged: PrSnapshot = {
  repo: "tharpep/sazed-frontend",
  number: 83,
  url: "https://github.com/tharpep/sazed-frontend/pull/83",
  state: "merged",
  checks: {
    state: "passing",
    passed: 2,
    total: 2,
    runs: [
      { name: "check", conclusion: "success" },
      { name: "tests", conclusion: "success" },
    ],
  },
  review: { verdict: "approve", source: "agy", url: "https://github.com/tharpep/sazed-frontend/pull/83#pullrequestreview-1" },
  additions: 1148,
  deletions: 105,
  merged_at: "2026-11-19T20:53:40+00:00",
  fetched_at: "2026-11-19T20:55:00+00:00",
};

const neverFetched: PrSnapshot = {
  ...merged,
  state: "open",
  checks: null,
  review: null,
  additions: null,
  deletions: null,
  merged_at: null,
  fetched_at: null,
};

describe("proof lines", () => {
  it("read a merged PR as the PR, its checks and its review", () => {
    const [pr, checks, review] = proofLines(merged);
    expect(pr).toMatchObject({ mark: "done", title: "PR sazed-frontend#83", value: "+1,148\u00a0-105" });
    expect(pr.detail).toMatch(/^Merged Thu 19 Nov, \d\d:53$/);
    expect(checks).toMatchObject({ mark: "done", detail: "check, tests", value: "2 of 2" });
    expect(review).toMatchObject({ mark: "done", title: "agy review", value: "approve" });
  });

  it("name the failing runs and mark a changes-requested review as a problem", () => {
    const pr: PrSnapshot = {
      ...merged,
      state: "open",
      checks: { state: "failing", passed: 1, total: 2, runs: [{ name: "check", conclusion: "success" }, { name: "tests", conclusion: "failure" }] },
      review: { ...merged.review!, verdict: "request_changes" },
    };
    const [prLine, checks, review] = proofLines(pr);
    expect(prLine).toMatchObject({ mark: "wait", detail: "Open" });
    expect(checks).toMatchObject({ mark: "bad", detail: "Failing: tests", value: "1 of 2" });
    expect(review).toMatchObject({ mark: "bad", value: "changes requested" });
  });

  it("say a never-fetched PR has no checks or review yet, never that it passed", () => {
    const [pr, checks, review] = proofLines(neverFetched);
    expect(pr).toMatchObject({ mark: "wait", value: "" });
    expect(checks).toMatchObject({ mark: "wait", detail: "Not fetched yet", value: "" });
    expect(review).toMatchObject({ mark: "wait", detail: "No review stored" });
  });

  it("read a draft and a closed PR in words", () => {
    expect(proofLines({ ...merged, state: "draft" })[0].detail).toBe("Draft");
    expect(proofLines({ ...merged, state: "closed" })[0]).toMatchObject({ mark: "bad", detail: "Closed without merging" });
  });

  it("count neutral and skipped runs as passed, as Sazed does", () => {
    const pr: PrSnapshot = {
      ...merged,
      checks: {
        state: "failing",
        passed: 3,
        total: 4,
        runs: [
          { name: "check", conclusion: "success" },
          { name: "deploy", conclusion: "skipped" },
          { name: "lint", conclusion: "neutral" },
          { name: "tests", conclusion: "failure" },
        ],
      },
    };
    expect(proofLines(pr)[1].detail).toBe("Failing: tests");
  });

  it("render a state, checks state or verdict from a newer Sazed as plain words", () => {
    const pr: PrSnapshot = {
      ...merged,
      state: "merge_queued",
      checks: { ...merged.checks!, state: "action_required" },
      review: { ...merged.review!, verdict: "needs_discussion" },
    };
    const [prLine, checks, review] = proofLines(pr);
    expect(prLine).toMatchObject({ mark: "wait", detail: "merge queued" });
    expect(checks).toMatchObject({ mark: "wait", detail: "action required: check, tests" });
    expect(review).toMatchObject({ mark: "wait", value: "needs discussion" });
    expect(mergeCallLine(pr)).toContain("agy review: needs discussion");
  });

  it("show no diff size until Sazed has one", () => {
    expect(diffSize({ ...merged, additions: null })).toBe("");
  });
});

describe("old snapshots", () => {
  const open: PrSnapshot = { ...merged, state: "open", merged_at: null };

  it("stay quiet up to twelve minutes, then show their age", () => {
    expect(snapshotAge(open, NOW)).toBe(300);
    expect(oldSnapshotText(open, NOW)).toBe("");
    expect(oldSnapshotText({ ...open, fetched_at: "2026-11-19T20:48:00+00:00" }, NOW)).toBe("");
    expect(oldSnapshotText({ ...open, fetched_at: "2026-11-19T20:47:59+00:00" }, NOW)).toBe("12 min old");
    expect(oldSnapshotText({ ...open, fetched_at: "2026-11-19T18:30:00+00:00" }, NOW)).toBe("2h old");
  });

  it("never call a merged or closed PR's last snapshot old: Sazed stops fetching it", () => {
    expect(oldSnapshotText({ ...merged, fetched_at: "2026-11-18T18:30:00+00:00" }, NOW)).toBe("");
    expect(oldSnapshotText({ ...open, state: "closed", fetched_at: "2026-11-18T18:30:00+00:00" }, NOW)).toBe("");
  });

  it("have no age when never fetched", () => {
    expect(snapshotAge(neverFetched, NOW)).toBeNull();
    expect(oldSnapshotText(neverFetched, NOW)).toBe("");
  });
});

describe("merge call lines", () => {
  const ready: PrSnapshot = { ...merged, state: "open", merged_at: null, additions: 412, deletions: 88 };

  it("keep a reviewed PR's verdict and name the reviewer as Sazed sends it", () => {
    expect(mergeCallLine({ ...ready, checks: { ...ready.checks!, passed: 3, total: 3 } })).toBe(
      "agy review: approve. Checks 3 of 3 passed. +412\u00a0-88."
    );
    expect(mergeCallLine({ ...ready, review: { ...ready.review!, source: "Claude subagent", verdict: "approve_with_nits" } })).toBe(
      "Claude subagent review: approve with nits. Checks 2 of 2 passed. +412\u00a0-88."
    );
  });

  it("say plainly when a PR has no review", () => {
    expect(mergeCallLine({ ...ready, review: null, checks: { ...ready.checks!, passed: 3, total: 3 } })).toBe(
      "No review. Checks 3 of 3 passed. +412\u00a0-88."
    );
  });

  it("shorten a long reviewer name and keep the verdict, checks and diff whole", () => {
    const source = "Claude Opus subagent, 2026-11-20, second pass after the fix-ups landed on the branch";
    const line = mergeCallLine({ ...ready, review: { ...ready.review!, source }, checks: { ...ready.checks!, passed: 3, total: 3 } });
    expect(line).toBe("Claude Opus subagent, 2026-11-2… review: approve. Checks 3 of 3 passed. +412 -88.");
    expect(mergeCallLine({ ...ready, review: { ...ready.review!, source: "Claude Opus subagent, 2026-11-20" } })).toMatch(
      /^Claude Opus subagent, 2026-11-20 review: approve\./
    );
  });

  it("say when there are no checks rather than guess", () => {
    expect(mergeCallLine({ ...ready, review: null, checks: { state: "none", passed: 0, total: 0, runs: [] }, additions: null })).toBe(
      "No review. No checks reported."
    );
  });
});
