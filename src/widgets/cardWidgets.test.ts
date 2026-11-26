import { describe, expect, it } from "vitest";

import * as samples from "@/mock/cardSamples";

import { getWidget } from "./catalog";
import { MERGE_LABEL } from "./mergeCall";
import { needsAnswer, needsParts } from "./NeedsYouWidget";
import { prPill, prVerdict } from "./PullRequestWidget";

const needsSchema = getWidget("NeedsYouWidget")!.props;
const prSchema = getWidget("PullRequestWidget")!.props;

describe("NeedsYouWidget props", () => {
  it("parse every sample, the empty one included", () => {
    for (const s of [samples.needsYouReal, samples.needsYouEmpty, samples.needsYouLong, samples.needsYouOversized]) {
      expect(needsSchema.safeParse(s).success).toBe(true);
    }
  });

  it("parse the raw /board/command reply as well as the trimmed view", () => {
    const raw = {
      needs: [],
      working: [],
      done: { succeeded: 2, failed: 0, latest: [], window_hours: 24 },
      sessions: [],
      session_health: { silent_after_s: 900, idle_silent_after_s: 86400, last_heard_at: null, stale_card_ids: [] },
    };
    expect(needsSchema.safeParse(raw).success).toBe(true);
  });

  it("fail a payload with no needs list", () => {
    expect(needsSchema.safeParse({ working: [], done: { succeeded: 0, failed: 0 } }).success).toBe(false);
  });

  it("split the mockup's needs into one question and 14 merge calls, reviewed first as Home orders them", () => {
    const parts = needsParts(samples.needsYouReal.needs);
    expect(parts.questions).toHaveLength(1);
    expect(parts.merges).toHaveLength(14);
    expect(parts.merges.slice(0, 2).map((m) => m.pr!.review?.verdict)).toEqual(["approve", "approve_with_nits"]);
    expect(needsAnswer(parts)).toBe("1 question, 14 PRs ready to merge");
  });
});

describe("PullRequestWidget props", () => {
  const all = [
    samples.prReal,
    samples.prFailing,
    samples.prMerged,
    samples.prClosed,
    samples.prNoChecks,
    samples.prReviewed,
    samples.prNoRuns,
    samples.prNone,
    samples.prLong,
    samples.prOversized,
  ];

  it("parse every sample, the card with no PR included", () => {
    for (const s of all) expect(prSchema.safeParse(s).success).toBe(true);
  });

  it("parse a card with no pr field at all, as older payloads send", () => {
    const { pr: _pr, ...card } = samples.prNone;
    expect(prSchema.safeParse(card).success).toBe(true);
  });

  it("read the same merge label Home shows for the same card", () => {
    expect(prVerdict(samples.prReal, samples.prReal.pr!).join(" · ")).toBe(MERGE_LABEL.unreviewed);
    expect(prVerdict(samples.prReviewed, samples.prReviewed.pr!).join(" · ")).toBe(MERGE_LABEL.reviewed);
  });

  it("name where a PR that is not a merge call stands", () => {
    expect(prPill(samples.prFailing, samples.prFailing.pr!)).toEqual({ tone: "err", word: "failing" });
    expect(prVerdict(samples.prClosed, samples.prClosed.pr!)[0]).toBe("Closed without merging");
    expect(prVerdict(samples.prMerged, samples.prMerged.pr!)[0]).toBe("Merged");
  });
});
