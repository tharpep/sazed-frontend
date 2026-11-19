import { describe, expect, it } from "vitest";

import type { ProjectCard } from "@/api/projects";
import { firstRows, shippedDays } from "./shipped";

function done(title: string, at: Date): ProjectCard {
  return { id: title, title, stage: "done", done_at: at.toISOString() } as ProjectCard;
}

describe("shippedDays", () => {
  const now = new Date(2026, 10, 19, 0, 20);

  it("splits at local midnight, newest first", () => {
    const days = shippedDays(
      [done("before midnight", new Date(2026, 10, 18, 23, 50)), done("after midnight", new Date(2026, 10, 19, 0, 5))],
      now
    );
    expect(days.map((d) => [d.label, d.cards.map((c) => c.title)])).toEqual([
      ["Today", ["after midnight"]],
      ["Yesterday", ["before midnight"]],
    ]);
  });

  it("keeps an empty Today, drops other empty days, and names older days", () => {
    const days = shippedDays([done("old", new Date(2026, 10, 16, 9, 0)), { ...done("open", now), stage: "next" }], now);
    expect(days.map((d) => [d.label, d.cards.length])).toEqual([
      ["Today", 0],
      ["Mon 16 Nov", 1],
    ]);
  });

  it("counts days by the calendar across a clock change", () => {
    // US clocks went back on 1 Nov 2026 and UK clocks on 25 Oct; both fall inside this window.
    const after = new Date(2026, 10, 2, 0, 30);
    const days = shippedDays(
      [
        done("last night", new Date(2026, 10, 1, 23, 30)),
        done("thirteen days back", new Date(2026, 9, 20, 0, 10)),
        done("fourteen days back", new Date(2026, 9, 19, 23, 50)),
      ],
      after
    );
    expect(days.map((d) => [d.label, d.cards.map((c) => c.title)])).toEqual([
      ["Today", []],
      ["Yesterday", ["last night"]],
      ["Tue 20 Oct", ["thirteen days back"]],
    ]);
  });

  it("orders by time, not by how the timestamp is written", () => {
    const now = new Date(2026, 10, 19, 23, 0);
    const late = { ...done("late", now), done_at: "2026-11-19T20:00:00-03:00" };
    const early = { ...done("early", now), done_at: "2026-11-19T22:00:00Z" };
    expect(shippedDays([early, late], now)[0].cards.map((c) => c.title)).toEqual(["late", "early"]);
  });

  it("leaves out cards older than the board's 14 days", () => {
    const days = shippedDays([done("too old", new Date(2026, 10, 5, 12, 0))], now);
    expect(days.map((d) => d.label)).toEqual(["Today"]);
  });
});

describe("firstRows", () => {
  it("keeps the first n rows across days and an empty Today", () => {
    const now = new Date(2026, 10, 19, 12, 0);
    const cards = Array.from({ length: 6 }, (_, i) => done(`y${i}`, new Date(2026, 10, 18, 10, i)));
    cards.push(...Array.from({ length: 6 }, (_, i) => done(`o${i}`, new Date(2026, 10, 17, 10, i))));
    const rows = firstRows(shippedDays(cards, now), 8);
    expect(rows.map((d) => [d.label, d.cards.length])).toEqual([
      ["Today", 0],
      ["Yesterday", 6],
      ["Tue 17 Nov", 2],
    ]);
  });
});
