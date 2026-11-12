import { describe, expect, it } from "vitest";

import { parseDeepLink } from "./deepLinks";

describe("parseDeepLink: the old links in the build plan's table", () => {
  it.each([
    ["?page=backlog&item=b-123", { hub: "work", view: "board", items: [{ kind: "backlog", id: "b-123" }] }],
    [
      "?page=projects&project=agent-stack",
      { hub: "work", view: "projects", items: [{ kind: "project", id: "agent-stack" }] },
    ],
    [
      "?page=plans&plan=console-overhaul&version=3",
      { hub: "work", view: "plans", items: [{ kind: "plan", id: "console-overhaul", version: 3 }] },
    ],
    ["?page=plans&dispatch=nav-model", { hub: "agents", view: "runs", items: [{ kind: "dispatch", id: "nav-model" }] }],
    ["?page=profiles&profile=coder", { hub: "agents", view: "profiles", items: [{ kind: "profile", id: "coder" }] }],
    ["?page=automations", { hub: "agents", view: "automations" }],
    ["?page=homelab", { hub: "system", view: "homelab" }],
    ["?page=activity", { hub: "system", view: "activity" }],
    ["?page=claude-usage", { hub: "system", view: "usage" }],
    ["?page=kb", { hub: "library", view: "knowledge" }],
    ["?page=journal", { hub: "library", view: "journal" }],
    ["?page=apps", { hub: "apps" }],
  ])("%s", (search, expected) => {
    expect(parseDeepLink(search)).toEqual(expected);
  });
});

describe("parseDeepLink: old pages without their item", () => {
  it.each([
    ["?page=backlog", { hub: "work", view: "board" }],
    ["?page=backlog&item=", { hub: "work", view: "board" }],
    ["?page=projects", { hub: "work", view: "projects" }],
    ["?page=plans", { hub: "work", view: "plans" }],
    ["?page=profiles", { hub: "agents", view: "profiles" }],
  ])("%s", (search, expected) => {
    expect(parseDeepLink(search)).toEqual(expected);
  });

  it.each(["?page=plans&plan=p&version=0", "?page=plans&plan=p&version=x", "?page=plans&plan=p&version=1.5", "?page=plans&plan=p"])(
    "%s drops a version that is not a positive integer",
    (search) => {
      expect(parseDeepLink(search)).toEqual({ hub: "work", view: "plans", items: [{ kind: "plan", id: "p" }] });
    },
  );

  it("a link with both plan and dispatch carries both, plan first, and lands on Plan Live", () => {
    expect(parseDeepLink("?page=plans&plan=p&version=2&dispatch=d")).toEqual({
      hub: "agents",
      view: "runs",
      items: [
        { kind: "plan", id: "p", version: 2 },
        { kind: "dispatch", id: "d" },
      ],
    });
  });
});

describe("parseDeepLink: hub aliases", () => {
  it.each([
    ["?page=home", { hub: "home" }],
    ["?page=chat", { hub: "chat" }],
    ["?page=work", { hub: "work" }],
    ["?page=agents", { hub: "agents" }],
    ["?page=system", { hub: "system" }],
    ["?page=library", { hub: "library" }],
    ["?page=apps.apps", { hub: "apps", view: "apps" }],
    ["?page=work.board", { hub: "work", view: "board" }],
    ["?page=system.integrations", { hub: "system", view: "integrations" }],
    ["?page=agents.mcp", { hub: "agents", view: "mcp" }],
    ["?page=agents.runs", { hub: "agents", view: "runs" }],
    ["?page=library.journal", { hub: "library", view: "journal" }],
    ["?page=chat.conversation", { hub: "chat", view: "conversation" }],
  ])("%s", (search, expected) => {
    expect(parseDeepLink(search)).toEqual(expected);
  });
});

describe("parseDeepLink: fallbacks", () => {
  it.each(["?page=nope", "?page=gateway", "?page=settings", "?page=work.nope", "?page=work.board.extra", "?page=.board", "?page=constructor", "?page=toString"])(
    "%s falls back to Home",
    (search) => {
      expect(parseDeepLink(search)).toEqual({ hub: "home" });
    },
  );

  it.each(["", "?item=b-1", "?page="])("%j is not a deep link", (search) => {
    expect(parseDeepLink(search)).toBeNull();
  });
});
