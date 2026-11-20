import { describe, expect, it } from "vitest";

import type { PrSnapshot } from "@/api/projects";

import { isMergeCall, MERGE_LABEL, mergeKind, orderMergeCalls } from "./mergeCall";

const ready: PrSnapshot = {
  repo: "tharpep/chat-service",
  number: 129,
  url: "https://github.com/tharpep/chat-service/pull/129",
  state: "open",
  checks: { state: "passing", passed: 3, total: 3, runs: [{ name: "check", conclusion: "success" }] },
  review: { verdict: "approve", source: "agy", url: "https://github.com/tharpep/chat-service/pull/129" },
  additions: 412,
  deletions: 88,
  merged_at: null,
  fetched_at: "2026-11-20T10:00:00+00:00",
};

const session = { stage: "needs_me", job_id: null };

describe("merge calls", () => {
  it("are session cards in Needs me with an open, green PR and no changes requested", () => {
    expect(isMergeCall({ ...session, pr: ready })).toBe(true);
    expect(isMergeCall({ ...session, pr: { ...ready, review: null } })).toBe(true);
  });

  it("are never a card outside Needs me, or one whose PR is not open", () => {
    expect(isMergeCall({ ...session, stage: "doing", pr: ready })).toBe(false);
    expect(isMergeCall({ ...session, pr: { ...ready, state: "closed" } })).toBe(false);
    expect(isMergeCall({ ...session, pr: { ...ready, state: "draft" } })).toBe(false);
    expect(isMergeCall({ ...session })).toBe(false);
  });

  it("are never a PR whose checks are failing, running, missing or unfetched", () => {
    for (const state of ["failing", "running", "none"]) {
      expect(isMergeCall({ ...session, pr: { ...ready, checks: { ...ready.checks!, state } } })).toBe(false);
    }
    expect(isMergeCall({ ...session, pr: { ...ready, checks: null } })).toBe(false);
  });

  it("are never a PR with changes requested", () => {
    expect(isMergeCall({ ...session, pr: { ...ready, review: { ...ready.review!, verdict: "request_changes" } } })).toBe(false);
  });

  it("are never a worker-job card, which keeps Sazed's next text and its own actions", () => {
    const job = { ...session, job_id: "8f0c", actions: [{ id: "merge", label: "Merge", takes_text: false }] };
    const readyJob = { ...job, next: "Ready to merge", pr: ready };
    const awaitingApproval = { ...job, next: "Approve the job", pr: ready };
    const failing = { ...job, next: "CI still failing after the fix-ups", pr: { ...ready, checks: { ...ready.checks!, state: "failing" } } };
    expect(isMergeCall(readyJob)).toBe(false);
    expect(isMergeCall(awaitingApproval)).toBe(false);
    expect(isMergeCall(failing)).toBe(false);
    expect(mergeKind(readyJob)).toBeNull();
  });
});

describe("merge call kinds", () => {
  it("read reviewed when a verdict is stored, whoever reviewed it", () => {
    expect(mergeKind({ ...session, pr: ready })).toBe("reviewed");
    expect(mergeKind({ ...session, pr: { ...ready, review: { ...ready.review!, verdict: "approve_with_nits", source: "Claude subagent" } } })).toBe(
      "reviewed"
    );
    expect(MERGE_LABEL.reviewed).toBe("Ready to merge · reviewed");
  });

  it("read no review when none is stored, and stay a merge call", () => {
    expect(mergeKind({ ...session, pr: { ...ready, review: null } })).toBe("unreviewed");
    expect(MERGE_LABEL.unreviewed).toBe("Ready to merge · no review");
  });

  it("are no kind at all for a card that is not a merge call", () => {
    expect(mergeKind({ ...session, stage: "doing", pr: ready })).toBeNull();
  });
});

describe("merge call order", () => {
  it("puts reviewed merge calls before unreviewed ones and leaves every other card in place", () => {
    const question = { id: "q", stage: "needs_me", job_id: "j1", pr: null };
    const bare = { id: "bare", ...session, pr: { ...ready, review: null } };
    const dispatch = { id: "d", stage: "needs_me", job_id: null, pr: null };
    const reviewed = { id: "rev", ...session, pr: ready };
    const bare2 = { id: "bare2", ...session, pr: { ...ready, number: 130, review: null } };
    const reviewed2 = { id: "rev2", ...session, pr: { ...ready, number: 131 } };
    const order = orderMergeCalls([question, bare, dispatch, reviewed, bare2, reviewed2]).map((c) => c.id);
    expect(order).toEqual(["q", "rev", "d", "rev2", "bare", "bare2"]);
  });
});
