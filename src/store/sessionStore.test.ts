import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { dateGroup, shortTime } from "./sessionStore";

// US clocks went forward on 2026-03-08, so local midnights before it are 23 hours closer.
const ZONE = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "America/New_York";
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-09T10:00:00-04:00"));
});

afterAll(() => {
  vi.useRealTimers();
  process.env.TZ = ZONE;
});

describe("day grouping across the DST change", () => {
  it("keeps two days ago out of Yesterday", () => {
    expect(dateGroup("2026-03-07T23:00:00-05:00")).toBe("This Week");
  });

  it("puts yesterday evening in Yesterday", () => {
    expect(dateGroup("2026-03-08T20:00:00-04:00")).toBe("Yesterday");
  });

  it("puts exactly seven days ago in Older", () => {
    expect(dateGroup("2026-03-02T10:00:00-05:00")).toBe("Older");
    expect(shortTime("2026-03-02T10:00:00-05:00")).toBe("Mar 2");
  });

  it("keeps six days ago in This Week, by weekday", () => {
    expect(dateGroup("2026-03-03T10:00:00-05:00")).toBe("This Week");
    expect(shortTime("2026-03-03T10:00:00-05:00")).toBe("Tue");
  });
});
