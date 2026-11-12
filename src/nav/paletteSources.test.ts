import { describe, expect, it } from "vitest";

import type { Service } from "@/api/homelab";
import {
  buildEntries,
  httpUrl,
  isShortcut,
  launchableApps,
  rankEntries,
  type PaletteItem,
  type ShortcutKeys,
} from "./paletteSources";

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

describe("launchableApps: the Apps page and palette filter", () => {
  it("drops planned, URL-less and console services, hides private ones and lists Apps before Homelab", () => {
    expect(launchableApps(SERVICES, false).map((s) => s.id)).toEqual(["jellyfin", "dashboard", "proxmox"]);
  });

  it("shows private apps once revealed", () => {
    expect(launchableApps(SERVICES, true).map((s) => s.id)).toContain("secret");
  });
});

describe("isShortcut", () => {
  const press = (over: Partial<ShortcutKeys>): ShortcutKeys => ({
    key: "k",
    code: "KeyK",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...over,
  });

  it("is Cmd+K on macOS and leaves Ctrl+K to the text field", () => {
    expect(isShortcut(press({ metaKey: true }), true)).toBe(true);
    expect(isShortcut(press({ ctrlKey: true }), true)).toBe(false);
  });

  it("is Ctrl+K elsewhere", () => {
    expect(isShortcut(press({ ctrlKey: true }), false)).toBe(true);
    expect(isShortcut(press({ metaKey: true }), false)).toBe(false);
    expect(isShortcut(press({ ctrlKey: true, shiftKey: true }), false)).toBe(false);
  });

  it("matches the physical K on a non-Latin layout", () => {
    expect(isShortcut(press({ ctrlKey: true, key: "л" }), false)).toBe(true);
    expect(isShortcut(press({ ctrlKey: true, key: "j", code: "KeyJ" }), false)).toBe(false);
  });
});

describe("app URLs", () => {
  it("opens only http and https", () => {
    expect(httpUrl("https://media.tail.ts.net:8096")).toBe("https://media.tail.ts.net:8096/");
    expect(httpUrl("http://192.168.1.10:8080/")).toBe("http://192.168.1.10:8080/");
    expect(httpUrl("javascript:alert(1)")).toBeNull();
    expect(httpUrl("data:text/html,hi")).toBeNull();
    expect(httpUrl("not a url")).toBeNull();
  });

  it("leaves an app with any other scheme off the Apps page and out of the palette", () => {
    const bad = service({ id: "bad", name: "Bad", open_url: "javascript:alert(1)" });
    const entries = buildEntries({ recent: [], services: [bad], privateRevealed: false, items: [], theme: "dark", shell: "old" });
    expect(launchableApps([bad], false)).toHaveLength(0);
    expect(entries.some((e) => e.kind === "app")).toBe(false);
  });
});

describe("rankEntries", () => {
  const jellyfinItem: PaletteItem = { ref: { kind: "service", id: "jellyfin" }, label: "Jellyfin", hint: "Service" };
  const entries = buildEntries({
    recent: [{ kind: "plan", id: "console-overhaul", version: 3 }],
    services: SERVICES,
    privateRevealed: false,
    items: [jellyfinItem],
    theme: "system",
    shell: "old",
  });

  it("offers the three ThemeToggle choices and marks the current one", () => {
    const themes = entries.filter((e) => e.kind === "action" && e.action.startsWith("theme:"));
    expect(themes.map((e) => [e.label, e.hint])).toEqual([
      ["Light theme", ""],
      ["Dark theme", ""],
      ["Match system theme", "Current"],
    ]);
  });

  it("offers the layout the console is not on", () => {
    const layout = (shell: "old" | "hubs") =>
      buildEntries({ recent: [], services: [], privateRevealed: false, items: [], theme: "system", shell })
        .filter((e) => e.kind === "action" && e.action.startsWith("shell:"))
        .map((e) => e.label);
    expect(layout("old")).toEqual(["Switch to the new layout"]);
    expect(layout("hubs")).toEqual(["Switch to the old layout"]);
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

describe("recent conversations", () => {
  const SESSION = "3f2a9c1e-0000-4000-8000-000000000001";
  const UNLISTED = "3f2a9c1e-0000-4000-8000-000000000002";
  const titled: PaletteItem = { ref: { kind: "session", id: SESSION }, label: "Seerr request", hint: "Conversation · 9:41 AM" };
  const recentOf = (shell: "old" | "hubs") =>
    buildEntries({
      recent: [
        { kind: "session", id: SESSION },
        { kind: "session", id: UNLISTED },
      ],
      services: [],
      privateRevealed: false,
      items: shell === "hubs" ? [titled] : [],
      theme: "system",
      shell,
    });

  it("labels a recent conversation with its title, and an unlisted one without its id", () => {
    const recent = recentOf("hubs").filter((e) => e.group === "Recent");
    expect(recent.map((e) => [e.label, e.hint])).toEqual([
      ["Seerr request", "Conversation · 9:41 AM"],
      ["Conversation", "Conversation"],
    ]);
  });

  it("finds a recent conversation by a typed title, once", () => {
    const found = rankEntries(recentOf("hubs"), "seerr");
    expect(found.map((e) => [e.group, e.label])).toEqual([["Recent", "Seerr request"]]);
  });

  it("leaves conversations out of the old shell's Recent", () => {
    expect(recentOf("old").filter((e) => e.group === "Recent")).toEqual([]);
  });
});
