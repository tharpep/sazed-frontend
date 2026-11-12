import { describe, expect, it } from "vitest";

import type { Service } from "@/api/homelab";
import { buildEntries, launchableApps, rankEntries, type PaletteItem } from "./paletteSources";

function service(over: Partial<Service> & { id: string }): Service {
  return {
    name: over.id,
    group: "apps",
    container: null,
    lifecycle: "active",
    description: "",
    open_url: `https://${over.id}.tail.ts.net/`,
    icon: null,
    depends_on: [],
    repo: null,
    private: false,
    live: null,
    state: null,
    ...over,
  };
}

const SERVICES = [
  service({ id: "proxmox", name: "Proxmox", group: "infra" }),
  service({ id: "jellyfin", name: "Jellyfin" }),
  service({ id: "sazed-console", name: "Sazed console" }),
  service({ id: "planned-app", name: "Planned", lifecycle: "planned" }),
  service({ id: "no-url", name: "No URL", open_url: null }),
  service({ id: "secret", name: "Secret", private: true }),
  service({ id: "dashboard", name: "Dashboard" }),
];

const labels = (entries: { label: string }[]) => entries.map((e) => e.label);

describe("launchableApps: the AppGrid filter", () => {
  it("drops planned, URL-less and console services, hides private ones and lists Apps before Homelab", () => {
    expect(launchableApps(SERVICES, false).map((s) => s.id)).toEqual(["jellyfin", "dashboard", "proxmox"]);
  });

  it("shows private apps once revealed", () => {
    expect(launchableApps(SERVICES, true).map((s) => s.id)).toContain("secret");
  });
});

describe("rankEntries", () => {
  const jellyfinItem: PaletteItem = { ref: { kind: "service", id: "jellyfin" }, label: "Jellyfin", hint: "Service" };
  const entries = buildEntries({
    recent: [{ kind: "plan", id: "console-overhaul", version: 3 }],
    services: SERVICES,
    privateRevealed: false,
    items: [jellyfinItem],
  });

  it("with no query lists every group in order and leaves Items out", () => {
    const groups = [...new Set(rankEntries(entries, "").map((e) => e.group))];
    expect(groups).toEqual(["Recent", "Hubs", "Apps", "Views", "Actions"]);
  });

  it("ranks an exact name first, ahead of a name that only contains the query", () => {
    const ranked = rankEntries(entries, "board");
    expect(ranked[0]).toMatchObject({ kind: "view", label: "Board", target: { hub: "work", view: "board" } });
    expect(labels(ranked)).toContain("Dashboard");
  });

  it("puts an app ahead of a homelab service item with the same name", () => {
    const ranked = rankEntries(entries, "jellyfin");
    expect(ranked.slice(0, 2).map((e) => e.kind)).toEqual(["app", "item"]);
  });

  it("requires every word and matches hints", () => {
    expect(labels(rankEntries(entries, "system usage"))).toEqual(["System", "Usage"]);
    expect(rankEntries(entries, "zzz")).toEqual([]);
  });

  it("never offers hidden apps or the open-conversation view", () => {
    const all = labels(rankEntries(entries, "a"));
    expect(all).not.toContain("Secret");
    expect(all).not.toContain("Sazed console");
    expect(all).not.toContain("Conversation");
  });
});
