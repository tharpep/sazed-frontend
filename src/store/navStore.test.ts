import { beforeEach, describe, expect, it } from "vitest";

import { loadItems, loadSubs, shownItem, useNavStore } from "./navStore";

describe("navStore closeItem: closes the slot of the item's own kind", () => {
  beforeEach(() => useNavStore.setState({ hub: "home", open: {}, read: {} }));

  it("closing a plan opened from a project keeps the project", () => {
    const nav = useNavStore.getState();
    nav.openItem({ kind: "project", id: "board" });
    nav.openItem({ kind: "plan", id: "board-plan" });
    useNavStore.getState().closeItem("plan");
    const s = useNavStore.getState();
    expect(s.read["work:plans"]).toBeUndefined();
    expect(s.open["work:projects"]).toEqual({ kind: "project", id: "board" });
  });

  it("closing Plan Live keeps the MCP server open in another Agents view", () => {
    const nav = useNavStore.getState();
    nav.openItem({ kind: "mcp", id: "github" });
    useNavStore.getState().go("agents", "runs");
    useNavStore.getState().openItem({ kind: "dispatch", id: "overhaul" });
    useNavStore.getState().closeItem("dispatch");
    const s = useNavStore.getState();
    expect(s.read["agents:runs"]).toBeUndefined();
    expect(s.open["agents:mcp"]).toEqual({ kind: "mcp", id: "github" });
  });

  it("does nothing when the slot holds another kind", () => {
    useNavStore.getState().openItem({ kind: "mcp", id: "github" });
    useNavStore.getState().closeItem("profile");
    expect(useNavStore.getState().open["agents:mcp"]).toEqual({ kind: "mcp", id: "github" });
  });

  it("keeps a profile open in Profiles while a job opens and closes in Runs", () => {
    useNavStore.getState().openItem({ kind: "profile", id: "builder" });
    useNavStore.getState().openItem({ kind: "job", id: "j1" });
    useNavStore.getState().closeItem("job");
    useNavStore.getState().go("agents", "profiles");
    expect(shownItem(useNavStore.getState())).toEqual({ kind: "profile", id: "builder" });
  });
});

describe("navStore openItem and applyPlace", () => {
  beforeEach(() => useNavStore.setState({ hub: "home", open: {}, read: {}, recent: [] }));

  it("opens an item in another hub with one store update", () => {
    let updates = 0;
    const off = useNavStore.subscribe(() => updates++);
    useNavStore.getState().openItem({ kind: "plan", id: "p" });
    off();
    expect(updates).toBe(1);
    expect(useNavStore.getState()).toMatchObject({ hub: "work", read: { "work:plans": { kind: "plan", id: "p" } } });
  });

  it("restores a place without touching Recent", () => {
    const place = { ...useNavStore.getState(), hub: "work" as const, read: { "work:plans": { kind: "plan" as const, id: "p" } } };
    useNavStore.getState().applyPlace(place);
    expect(useNavStore.getState().hub).toBe("work");
    expect(useNavStore.getState().recent).toEqual([]);
  });
});

describe("navStore card sheets", () => {
  beforeEach(() => useNavStore.setState({ hub: "home", open: {}, read: {}, sheet: {}, recent: [] }));

  it("files a sheet under the view it was opened in and closes it there", () => {
    useNavStore.getState().openSheet({ kind: "backlog", id: "c1" });
    expect(useNavStore.getState().sheet).toEqual({ "home:home": { kind: "backlog", id: "c1" } });
    useNavStore.getState().closeSheet();
    expect(useNavStore.getState().sheet).toEqual({});
  });

  it("drops the sheet of the view being left, so coming back by tab shows the page alone", () => {
    useNavStore.getState().openSheet({ kind: "backlog", id: "c1" });
    useNavStore.getState().go("work", "board");
    useNavStore.getState().go("home");
    expect(useNavStore.getState().sheet).toEqual({});
  });
});

describe("loadItems", () => {
  it("keeps items filed under their own view and drops the older per-hub shape", () => {
    expect(
      loadItems({
        "agents:profiles": { kind: "profile", id: "builder" },
        "agents:runs": { kind: "profile", id: "misfiled" },
        agents: { kind: "job", id: "old" },
        "work:board": { kind: "backlog", id: "" },
      })
    ).toEqual({ "agents:profiles": { kind: "profile", id: "builder" } });
    expect(loadItems(null)).toEqual({});
    expect(loadItems("x")).toEqual({});
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

  it("keeps a view's named picker under its own key", () => {
    useNavStore.getState().setSub("work:board.type", "bug");
    expect(useNavStore.getState().sub).toEqual({ "work:board.type": "bug" });
    expect(loadSubs({ "work:board.type": "open", "work:board": "dismissed" })).toEqual({});
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
