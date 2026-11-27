import { describe, expect, it } from "vitest";

import type { Filed, Note } from "@/api/notes";
import { becauseText, filedText, isFresh, quickTopics, topicProblem } from "./topics";

const NOW = new Date(2026, 10, 21, 12, 0);
const HOUR = 60 * 60 * 1000;

function filed(over: Partial<Filed>): Filed {
  return { by: "agent", at: null, reason: null, kind: null, filer: null, ...over };
}

describe("topicProblem", () => {
  it("accepts names the pattern allows", () => {
    expect(topicProblem("New job")).toBeNull();
    expect(topicProblem("R&D 2-b's")).toBeNull();
    expect(topicProblem("  Trim me  ")).toBeNull();
    expect(topicProblem("a".repeat(40))).toBeNull();
  });

  it("asks for a name when empty or blank", () => {
    expect(topicProblem("")).toBe("Give the topic a name.");
    expect(topicProblem("   ")).toBe("Give the topic a name.");
  });

  it("rejects bad characters, a leading symbol and 41 characters", () => {
    const rule = "Use up to 40 letters, digits, spaces, & ' or -.";
    expect(topicProblem("a/b")).toBe(rule);
    expect(topicProblem("-start")).toBe(rule);
    expect(topicProblem("a".repeat(41))).toBe(rule);
    expect(topicProblem("café")).toBe(rule);
  });
});

describe("becauseText", () => {
  it("is empty for null and blank", () => {
    expect(becauseText(null)).toBe("");
    expect(becauseText("   ")).toBe("");
  });

  it("lower-cases a leading Because and adds a period", () => {
    expect(becauseText("Because it mentions standup")).toBe("because it mentions standup.");
    expect(becauseText("  because of x  ")).toBe("because of x.");
  });

  it("keeps terminal punctuation", () => {
    expect(becauseText("because x.")).toBe("because x.");
    expect(becauseText("because x!")).toBe("because x!");
    expect(becauseText("because x?")).toBe("because x?");
  });

  it("leaves other text alone", () => {
    expect(becauseText("It mentions Because")).toBe("It mentions Because.");
  });
});

describe("isFresh", () => {
  const at = (ms: number) => ({ time: new Date(NOW.getTime() - ms).toISOString() });

  it("is true within the last 24 hours", () => {
    expect(isFresh(at(0), NOW)).toBe(true);
    expect(isFresh(at(23 * HOUR), NOW)).toBe(true);
  });

  it("is false at 24 hours and older", () => {
    expect(isFresh(at(24 * HOUR), NOW)).toBe(false);
    expect(isFresh(at(48 * HOUR), NOW)).toBe(false);
  });

  it("is true for a time after now, so a device clock behind the server still shows a new note's filed line", () => {
    expect(isFresh(at(-30 * 1000), NOW)).toBe(true);
    expect(isFresh(at(-HOUR), NOW)).toBe(true);
  });
});

describe("filedText", () => {
  const pick = (topic: string | null, f: Note["filed"]) => filedText({ topic, filed: f });

  it("is null without a topic", () => {
    expect(pick(null, null)).toBeNull();
    expect(pick(null, filed({ by: "you" }))).toBeNull();
  });

  it("reads a move by you", () => {
    expect(pick("Work", filed({ by: "you", reason: "because x" }))).toEqual({
      lead: "You moved this to ",
      topic: "Work",
      tail: ".",
    });
  });

  it("reads a note with no filed record as Under", () => {
    expect(pick("Work", null)).toEqual({ lead: "Under ", topic: "Work", tail: "." });
  });

  it("gives the reason as a because clause", () => {
    expect(pick("New job", filed({ reason: "Because it mentions standup" }))).toEqual({
      lead: "Filed under ",
      topic: "New job",
      tail: " because it mentions standup.",
    });
  });

  it("ends with a period when there is no reason", () => {
    expect(pick("Work", filed({ reason: null }))).toEqual({
      lead: "Filed under ",
      topic: "Work",
      tail: ".",
    });
    expect(pick("Work", filed({ reason: "  " }))?.tail).toBe(".");
  });
});

describe("quickTopics", () => {
  const topics = [
    { name: "Work", count: 5 },
    { name: "Home", count: 3 },
    { name: "Ideas", count: 2 },
  ];

  it("takes the first two in order", () => {
    expect(quickTopics(topics, null).map((t) => t.name)).toEqual(["Work", "Home"]);
  });

  it("skips the current topic ignoring case", () => {
    expect(quickTopics(topics, "work").map((t) => t.name)).toEqual(["Home", "Ideas"]);
  });

  it("honours max", () => {
    expect(quickTopics(topics, null, 1)).toEqual([topics[0]]);
    expect(quickTopics(topics, null, 5)).toHaveLength(3);
  });

  it("is empty for no topics", () => {
    expect(quickTopics([], "x")).toEqual([]);
  });
});
