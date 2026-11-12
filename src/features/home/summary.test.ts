import { describe, expect, it } from "vitest";

import type { Automation, AutomationDetail } from "@/api/automations";
import type { BacklogItem } from "@/api/backlog";
import type { CalendarEvent } from "@/api/display";
import type { Project } from "@/api/projects";

import {
  failedStep,
  latestFailure,
  nextRun,
  projectsByRank,
  readyCount,
  runSentence,
  todayEntries,
  topReady,
} from "./summary";

const NOW = new Date(2026, 10, 12, 12, 0);

function at(h: number, m = 0): string {
  return new Date(2026, 10, 12, h, m).toISOString();
}

function event(title: string, start: string, end: string, all_day = false): CalendarEvent {
  return { id: title, title, start, end, all_day };
}

function item(id: string, rank: number | null, status: BacklogItem["status"] = "new"): BacklogItem {
  return { id, rank, status, title: id } as BacklogItem;
}

function auto(name: string, over: Partial<Automation>): Automation {
  return { id: name, name, enabled: true, next_run_at: null, last_run_at: null, last_status: null, ...over } as Automation;
}

describe("todayEntries", () => {
  it("drops events that have ended, puts all-day ones first and the tasks last", () => {
    const entries = todayEntries(
      [
        event("Dentist", at(13, 30), at(14, 30)),
        event("Stand-up", at(10), at(10, 30)),
        event("Lunch", at(11, 30), at(12, 30)),
        event("Holiday", at(0), at(23, 59), true),
      ],
      2,
      NOW
    );
    expect(entries).toEqual([
      { when: "all day", timed: false, text: "Holiday" },
      { when: "11:30", timed: true, text: "Lunch" },
      { when: "13:30", timed: true, text: "Dentist" },
      { when: "due", timed: false, text: "2 tasks due today" },
    ]);
  });

  it("says task, singular, and adds nothing when none are due", () => {
    expect(todayEntries([], 1, NOW)).toEqual([{ when: "due", timed: false, text: "1 task due today" }]);
    expect(todayEntries([], 0, NOW)).toEqual([]);
  });
});

describe("Ready", () => {
  const items = [item("c", 3), item("a", 1), item("x", null), item("d", 4), item("b", 2), item("gone", 0, "approved")];

  it("takes the top three ranked open items in rank order", () => {
    expect(topReady(items).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("counts every open item, ranked or not", () => {
    expect(readyCount(items)).toBe(5);
  });
});

describe("projectsByRank", () => {
  it("keeps active projects, ranked first, unranked last", () => {
    const projects = [
      { id: "u", state: "active", rank: null },
      { id: "p", state: "paused", rank: 1 },
      { id: "b", state: "active", rank: 2 },
      { id: "a", state: "active", rank: 1 },
    ] as Project[];
    expect(projectsByRank(projects).map((p) => p.id)).toEqual(["a", "b", "u"]);
  });
});

describe("the automations line", () => {
  const scout = auto("Daily scout", { last_status: "error", last_run_at: at(9) });
  const old = auto("Weekly digest", { last_status: "error", last_run_at: new Date(2026, 10, 10, 9).toISOString() });
  const brief = auto("Morning brief", { next_run_at: new Date(2026, 10, 13, 7).toISOString() });
  const later = auto("Backup check", { next_run_at: new Date(2026, 10, 14, 7).toISOString() });
  const paused = auto("Paused", { enabled: false, next_run_at: at(13) });

  it("finds only a failure from the last 24 hours", () => {
    expect(latestFailure([old, scout, brief], NOW)?.name).toBe("Daily scout");
    expect(latestFailure([old, brief], NOW)).toBeNull();
  });

  it("names the step the latest run failed at", () => {
    const detail = {
      runs: [{ steps: [{ name: "fetch", status: "ok" }, { name: "search", status: "error" }] }, { steps: [] }],
    } as unknown as AutomationDetail;
    expect(failedStep(detail)).toBe("search");
    expect(failedStep({ runs: [] } as unknown as AutomationDetail)).toBeNull();
  });

  it("says the failure with its step, or else the next enabled run", () => {
    expect(runSentence(scout, "search", brief, NOW)).toBe("Daily scout failed at the search step, 3h ago");
    expect(runSentence(scout, null, brief, NOW)).toBe("Daily scout failed, 3h ago");
    expect(nextRun([later, paused, brief])?.name).toBe("Morning brief");
    expect(runSentence(null, null, brief, NOW)).toBe("Next run: Morning brief, tomorrow 7 AM");
    expect(runSentence(null, null, null, NOW)).toBeNull();
  });
});
