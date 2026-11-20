import { describe, expect, it } from "vitest";

import { ageSince, DISPATCH_STALE_AFTER_S, heardLabel, isStale } from "./heard";

describe("last heard", () => {
  const now = Date.parse("2026-11-19T12:00:00Z");

  it("ages a heartbeat in seconds and never invents one", () => {
    expect(ageSince("2026-11-19T11:59:20Z", now)).toBe(40);
    expect(ageSince(null, now)).toBeNull();
    expect(ageSince("not a time", now)).toBeNull();
    expect(ageSince("2026-11-19T12:00:05Z", now)).toBe(0);
  });

  it("labels the age, or says unknown", () => {
    expect(heardLabel(40)).toBe("last heard 40s ago");
    expect(heardLabel(150)).toBe("last heard 2 min ago");
    expect(heardLabel(7300)).toBe("last heard 2h ago");
    expect(heardLabel(null)).toBe("last heard unknown");
  });

  it("is stale only past the reaper's grace for worker jobs", () => {
    expect(isStale(120)).toBe(false);
    expect(isStale(121)).toBe(true);
    expect(isStale(null)).toBe(false);
  });

  it("gives a dispatch task the reaper's longer dispatch grace", () => {
    expect(isStale(150, DISPATCH_STALE_AFTER_S)).toBe(false);
    expect(isStale(151, DISPATCH_STALE_AFTER_S)).toBe(true);
  });
});
