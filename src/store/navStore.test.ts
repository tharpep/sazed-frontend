import { beforeEach, describe, expect, it } from "vitest";

import { loadSubs, shownItem, useNavStore } from "./navStore";

describe("navStore closeItem: closes the slot of the item's own kind", () => {
  beforeEach(() => useNavStore.setState({ hub: "home", open: {}, read: {} }));

  it("closing a plan opened from a project keeps the project", () => {
    const nav = useNavStore.getState();
    nav.openItem({ kind: "project", id: "board" });
    nav.openItem({ kind: "plan", id: "board-plan" });
    useNavStore.getState().closeItem("plan");
    const s = useNavStore.getState();
    expect(s.read.work).toBeUndefined();
    expect(s.open.work).toEqual({ kind: "project", id: "board" });
  });

  it("closing Plan Live keeps the MCP server open in another Agents view", () => {
    const nav = useNavStore.getState();
    nav.openItem({ kind: "mcp", id: "github" });
    useNavStore.getState().go("agents", "runs");
    useNavStore.getState().openItem({ kind: "dispatch", id: "overhaul" });
    useNavStore.getState().closeItem("dispatch");
    const s = useNavStore.getState();
    expect(s.read.agents).toBeUndefined();
    expect(s.open.agents).toEqual({ kind: "mcp", id: "github" });
  });

  it("does nothing when the slot holds another kind", () => {
    useNavStore.getState().openItem({ kind: "mcp", id: "github" });
    useNavStore.getState().closeItem("profile");
    expect(useNavStore.getState().open.agents).toEqual({ kind: "mcp", id: "github" });
  });
});

describe("shownItem: the item on screen in the current view", () => {
  beforeEach(() => useNavStore.setState({ hub: "home", open: {}, read: {} }));

  it("is the plan in Plans, not the project kept for Projects", () => {
    useNavStore.getState().openItem({ kind: "project", id: "board" });
    useNavStore.getState().openItem({ kind: "plan", id: "board-plan" });
    expect(shownItem(useNavStore.getState())).toEqual({ kind: "plan", id: "board-plan" });
  });

  it("is nothing in Runs while only an MCP server is open", () => {
    useNavStore.getState().openItem({ kind: "mcp", id: "github" });
    useNavStore.getState().go("agents", "runs");
    expect(shownItem(useNavStore.getState())).toBeNull();
  });

  it("prefers the reader over a sheet of the same view", () => {
    useNavStore.getState().openItem({ kind: "job", id: "j1" });
    useNavStore.getState().openItem({ kind: "dispatch", id: "overhaul" });
    expect(shownItem(useNavStore.getState())).toEqual({ kind: "dispatch", id: "overhaul" });
  });
});

describe("navStore sub: each view's third-level choice", () => {
  beforeEach(() => useNavStore.setState({ sub: {} }));

  it("keeps only known views and their known choices when loading what was saved", () => {
    expect(
      loadSubs({
        "system:homelab": "list",
        "system:activity": "everything",
        "system:usage": 7,
        "work:board": "ready",
        "nonsense:view": "map",
      })
    ).toEqual({ "system:homelab": "list" });
  });

  it("loads nothing from a saved value that is not an object", () => {
    expect(loadSubs(null)).toEqual({});
    expect(loadSubs("map")).toEqual({});
    expect(loadSubs(["list"])).toEqual({});
  });

  it("stores a valid choice per view", () => {
    useNavStore.getState().setSub("system:homelab", "storage");
    useNavStore.getState().setSub("system:activity", "errors");
    expect(useNavStore.getState().sub).toEqual({ "system:homelab": "storage", "system:activity": "errors" });
  });

  it("ignores a choice the view does not have", () => {
    useNavStore.getState().setSub("system:homelab", "errors" as never);
    expect(useNavStore.getState().sub).toEqual({});
  });

  it("survives a retap of the hub, which resets only the view, items and scroll", () => {
    useNavStore.getState().go("system", "homelab");
    useNavStore.getState().setSub("system:homelab", "list");
    useNavStore.getState().go("system");
    expect(useNavStore.getState().sub["system:homelab"]).toBe("list");
  });
});
