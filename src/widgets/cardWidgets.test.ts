import { describe, expect, it } from "vitest";

import * as samples from "@/mock/cardSamples";

import { getWidget } from "./catalog";
import { MERGE_LABEL } from "./mergeCall";
import { needsAnswer, needsParts } from "./NeedsYouWidget";
import { prPill, prVerdict, PullRequestWidget, sizeShare, topNames } from "./PullRequestWidget";
import { NeedsYouWidget } from "./NeedsYouWidget";
import { isGitHubLink } from "./card/links";
import { isConsoleLink } from "@/nav/openRef";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("card links", () => {
  it("allow a PR link only as https on github.com", () => {
    expect(isGitHubLink("https://github.com/tharpep/sazed/pull/214")).toBe(true);
    for (const bad of ["data:text/html,<b>x</b>", "javascript:alert(1)", "http://github.com/a/b/pull/1", "https://evil.example/a/b/pull/1", "https://github.com.evil.example/x", "not a url"]) {
      expect(isGitHubLink(bad)).toBe(false);
    }
  });

  it("allow a console link only as https in a ?open= or ?page= shape", () => {
    expect(isConsoleLink("https://sazed.tail77c590.ts.net/?open=backlog:0f3c5a1e-7d2b-4c8e-9a61-2b7e4d9c1f00")).toBe(true);
    expect(isConsoleLink("https://sazed.tail77c590.ts.net/?page=home")).toBe(true);
    for (const bad of [
      "data:text/html,?open=job:1",
      "javascript:alert(1)//?open=job:1",
      "http://sazed.tail77c590.ts.net/?open=job:1",
      "https://sazed.tail77c590.ts.net/?open=wallet:1",
      "https://sazed.tail77c590.ts.net/?open=job:..",
      "https://sazed.tail77c590.ts.net/?page=nowhere",
      "https://sazed.tail77c590.ts.net/",
      "https://user:pass@sazed.tail77c590.ts.net/?open=job:1",
      "https://user@sazed.tail77c590.ts.net/?open=job:1",
      "https://192.168.50.155/?open=job:1",
      "https://3232248475/?open=job:1",
      "https://[::1]/?open=job:1",
      "https://sazed.tail77c590.ts.net:8443/?open=job:1",
    ]) {
      expect(isConsoleLink(bad)).toBe(false);
    }
  });

  it("draw a link that fails as plain text, never as an anchor", () => {
    const pr = renderToStaticMarkup(
      createElement(PullRequestWidget, { ...samples.prReal, pr: { ...samples.prReal.pr!, url: "data:text/html,x" }, open_url: "javascript:alert(1)" })
    );
    expect(pr).not.toContain("<a");
    expect(pr).toContain("Open PR (link not shown)");
    const needs = renderToStaticMarkup(createElement(NeedsYouWidget, { ...samples.needsYouEmpty, open_url: "http://sazed.tail77c590.ts.net/?page=home" }));
    expect(needs).not.toContain("<a");
    expect(renderToStaticMarkup(createElement(NeedsYouWidget, samples.needsYouEmpty))).toContain('href="https://sazed.tail77c590.ts.net/?page=home"');
  });
});

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

  it("parse unknown kinds and stages and a pr with only its identity", () => {
    const item = { ...samples.needsYouReal.needs[1], kind: "plan", stage: "archived", pr: { repo: "a/b", number: 1, url: "https://github.com/a/b/pull/1", state: "open" } };
    const view = { ...samples.needsYouReal, needs: [item], working: [{ kind: "session", title: "x", elapsed_s: 1 }] };
    expect(needsSchema.safeParse(view).success).toBe(true);
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

  it("parse a pr with no checks, review, additions or deletions keys, and an unknown stage", () => {
    const { checks: _c, review: _r, additions: _a, deletions: _d, ...pr } = samples.prReal.pr!;
    expect(prSchema.safeParse({ ...samples.prReal, stage: "archived", pr }).success).toBe(true);
  });

  it("parse a pr with no merged_at or fetched_at keys", () => {
    const { merged_at: _m, fetched_at: _f, ...pr } = samples.prReal.pr!;
    expect(prSchema.safeParse({ ...samples.prReal, pr }).success).toBe(true);
  });

  it("name at most three runs per group, then a count", () => {
    expect(topNames(["a", "b"])).toBe("a, b");
    expect(topNames(["a", "b", "c", "d", "e"])).toBe("a, b, c +2 more");
  });

  it("scale the size bar on a log scale: the mockup's 500 lines fill about four fifths", () => {
    expect(sizeShare(500)).toBeCloseTo(0.82, 2);
    expect(sizeShare(20)).toBeLessThan(0.45);
    expect(sizeShare(15_000)).toBe(1);
  });

  it("name where a PR that is not a merge call stands", () => {
    expect(prPill(samples.prFailing, samples.prFailing.pr!)).toEqual({ tone: "err", word: "failing" });
    expect(prVerdict(samples.prClosed, samples.prClosed.pr!)[0]).toBe("Closed without merging");
    expect(prVerdict(samples.prMerged, samples.prMerged.pr!)[0]).toBe("Merged");
  });
});
