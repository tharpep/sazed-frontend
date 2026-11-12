import { beforeEach, describe, expect, it } from "vitest";

import { loadSubs, useNavStore } from "./navStore";

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
