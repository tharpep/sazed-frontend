import { describe, expect, it } from "vitest";

import type { Note } from "@/api/notes";
import {
  cardText,
  groupByDay,
  noteWeight,
  splitColumns,
  splitMatch,
  timeLabel,
} from "./format";

function note(time: Date, excerpt = "", title = "t"): Note {
  return {
    path: `${title}.md`,
    folder: "notes",
    title,
    time: time.toISOString(),
    source: null,
    excerpt,
    match: null,
  };
}

const NOW = new Date(2026, 10, 21, 12, 0);

describe("groupByDay", () => {
  it("labels Today, Yesterday and older days, newest day first", () => {
    const groups = groupByDay(
      [
        note(new Date(2026, 10, 17, 9, 0), "", "old"),
        note(new Date(2026, 10, 21, 8, 0), "", "now"),
        note(new Date(2026, 10, 20, 8, 0), "", "yes"),
      ],
      NOW,
    );
    expect(groups.map(({ key, label, sub }) => ({ key, label, sub }))).toEqual([
      { key: "2026-11-21", label: "Today", sub: "21 Nov" },
      { key: "2026-11-20", label: "Yesterday", sub: "20 Nov" },
      { key: "2026-11-17", label: "Tue 17 Nov", sub: "" },
    ]);
  });

  it("splits notes at local midnight and sorts each day newest first", () => {
    const groups = groupByDay(
      [
        note(new Date(2026, 10, 21, 0, 0), "", "first"),
        note(new Date(2026, 10, 20, 23, 59), "", "late"),
        note(new Date(2026, 10, 21, 23, 59), "", "last"),
      ],
      NOW,
    );
    expect(groups.map((g) => g.notes.map((n) => n.title))).toEqual([
      ["last", "first"],
      ["late"],
    ]);
  });

  it("treats the day before the first of the month as Yesterday", () => {
    const groups = groupByDay(
      [note(new Date(2026, 9, 31, 10, 0))],
      new Date(2026, 10, 1, 9, 0),
    );
    expect(groups[0]).toMatchObject({
      key: "2026-10-31",
      label: "Yesterday",
      sub: "31 Oct",
    });
  });

  it("returns no groups for no notes", () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });
});

describe("splitColumns", () => {
  const id = (n: number) => n;

  it("gives each item to the lightest column so far", () => {
    expect(splitColumns([5, 1, 1, 1, 1], 2, id)).toEqual([[5], [1, 1, 1, 1]]);
  });

  it("breaks a tie toward the leftmost column", () => {
    expect(splitColumns([1, 1, 1, 1, 1], 3, id)).toEqual([[1, 1], [1, 1], [1]]);
  });

  it("keeps empty columns when there are fewer items than columns", () => {
    expect(splitColumns([2], 3, id)).toEqual([[2], [], []]);
  });
});

describe("noteWeight", () => {
  it.each([
    ["", 2],
    ["a", 3],
    ["a".repeat(32), 3],
    ["a".repeat(33), 4],
    ["a".repeat(1000), 14],
  ])("%j.length=%#", (excerpt, expected) => {
    expect(noteWeight(note(NOW, excerpt))).toBe(expected);
  });
});

describe("timeLabel", () => {
  it("is local 24-hour HH:MM", () => {
    expect(timeLabel(new Date(2026, 10, 21, 7, 5).toISOString())).toBe("07:05");
    expect(timeLabel(new Date(2026, 10, 21, 23, 59).toISOString())).toBe(
      "23:59",
    );
  });
});

describe("cardText", () => {
  it("keeps an excerpt of 280 characters", () => {
    const excerpt = "a".repeat(280);
    expect(cardText(note(NOW, excerpt))).toBe(excerpt);
  });

  it("cuts a longer excerpt to 280 characters plus an ellipsis", () => {
    expect(cardText(note(NOW, "a".repeat(281)))).toBe(`${"a".repeat(280)}…`);
  });
});

describe("splitMatch", () => {
  it("marks every case-insensitive occurrence", () => {
    expect(splitMatch("Foo bar foo", "foo")).toEqual([
      { text: "Foo", hit: true },
      { text: " bar ", hit: false },
      { text: "foo", hit: true },
    ]);
  });

  it("returns the whole text unmarked for an empty q", () => {
    expect(splitMatch("Foo bar", "")).toEqual([
      { text: "Foo bar", hit: false },
    ]);
  });

  it("returns the whole text unmarked when nothing matches", () => {
    expect(splitMatch("Foo bar", "baz")).toEqual([
      { text: "Foo bar", hit: false },
    ]);
  });

  it("treats regex characters in q literally", () => {
    expect(splitMatch("a.b axb", "a.b")).toEqual([
      { text: "a.b", hit: true },
      { text: " axb", hit: false },
    ]);
  });
});
