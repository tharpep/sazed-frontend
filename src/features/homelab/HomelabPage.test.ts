import { describe, expect, it } from "vitest";

import { useShellStore } from "@/nav/shellFlag";
import { useNavStore } from "@/store/navStore";
import "./HomelabPage";

describe("switching to the old shell", () => {
  it("drops the service the hub shell left open, so the old shell's Homelab does not open it", () => {
    useShellStore.setState({ shell: "hubs" });
    useNavStore.setState({ open: { system: { kind: "service", id: "postgres" }, work: { kind: "backlog", id: "b-1" } } });
    useShellStore.getState().setShell("old");
    expect(useNavStore.getState().open).toEqual({ work: { kind: "backlog", id: "b-1" } });
  });

  it("keeps a service picked while the old shell is already the shell", () => {
    useShellStore.setState({ shell: "old" });
    useNavStore.setState({ open: { system: { kind: "service", id: "postgres" } } });
    useShellStore.getState().setShell("old");
    expect(useNavStore.getState().open.system).toEqual({ kind: "service", id: "postgres" });
  });
});
