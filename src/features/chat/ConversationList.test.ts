import { describe, expect, it } from "vitest";

import type { ChatSession } from "@/store/sessionStore";
import { groupSessions } from "./ConversationList";

function session(id: string, title: string, dateGroup: string): ChatSession {
  return { id, title, time: "", shortTime: "", dateGroup };
}

const SESSIONS = [
  session("1", "Board for today", "Today"),
  session("2", "Seerr request not importing", "Today"),
  session("3", "Plan 17 boundary", "Yesterday"),
  session("4", "Morning brief", "Older"),
];

describe("groupSessions", () => {
  it("groups by day heading in list order", () => {
    expect(groupSessions(SESSIONS, "").map(([label, s]) => [label, s.map((x) => x.id)])).toEqual([
      ["Today", ["1", "2"]],
      ["Yesterday", ["3"]],
      ["Older", ["4"]],
    ]);
  });

  it("keeps only titles holding the query, ignoring case, and drops empty groups", () => {
    expect(groupSessions(SESSIONS, "SEERR")).toEqual([["Today", [SESSIONS[1]]]]);
  });

  it("treats a blank query as no filter", () => {
    expect(groupSessions(SESSIONS, "   ")).toHaveLength(3);
  });
});
