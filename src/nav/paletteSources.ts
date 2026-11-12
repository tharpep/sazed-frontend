import { create } from "zustand";

import { fetchServices, type Service } from "@/api/homelab";
import { statusOf, visibleServices } from "@/features/homelab/format";
import type { ItemKind, ItemRef } from "@/store/navStore";
import { useUiStore } from "@/store/uiStore";
import { HUBS } from "./hubs";
import type { HubId, NavTarget } from "./hubViews";
import type { ShellKind } from "./shellFlag";

export type PaletteGroup = "Recent" | "Hubs" | "Apps" | "Views" | "Items" | "Actions";
export type ThemeChoice = "light" | "dark" | "system";
export type PaletteAction = "settings" | "new-chat" | `theme:${ThemeChoice}` | `shell:${ShellKind}`;

interface EntryBase {
  key: string;
  group: PaletteGroup;
  label: string;
  hint: string;
}

export type PaletteEntry = EntryBase &
  (
    | { kind: "hub"; hub: HubId }
    | { kind: "view"; target: NavTarget }
    | { kind: "app"; url: string }
    | { kind: "item"; ref: ItemRef }
    | { kind: "action"; action: PaletteAction }
  );

/** An item a hub's existing API call returned, offered once a query is typed. */
export interface PaletteItem {
  ref: ItemRef;
  label: string;
  hint: string;
}

/** Each hub slice pushes one provider here; the palette calls them all when it opens. */
export type ItemProvider = () => Promise<PaletteItem[]>;
export const itemProviders: ItemProvider[] = [];

export const usePaletteStore = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

/** Opens the palette from a tap. iOS raises the keyboard only for a focus() made inside the
 * gesture, and the palette's input mounts a frame later, so a throwaway input inside `host` takes
 * focus now; iOS keeps the keyboard up when the palette moves focus to its own input. */
export function openPaletteFromTap(host: HTMLElement) {
  const proxy = document.createElement("input");
  proxy.setAttribute("aria-hidden", "true");
  proxy.tabIndex = -1;
  // 16px stops iOS zooming on focus; the input is invisible and takes no space.
  proxy.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0";
  host.appendChild(proxy);
  proxy.focus();
  usePaletteStore.getState().setOpen(true);
  setTimeout(() => proxy.remove(), 1000);
}

export type ShortcutKeys = Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">;

/** Cmd+K on macOS, where Ctrl+K stays kill-to-end-of-line in text fields; Ctrl+K elsewhere.
 * `code` matches the physical K on layouts whose K key types another letter. */
export function isShortcut(e: ShortcutKeys, isMac: boolean): boolean {
  const mod = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  return mod && !e.altKey && !e.shiftKey && (e.key.toLowerCase() === "k" || e.code === "KeyK");
}

const THEME_LABEL: Record<ThemeChoice, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "Match system theme",
};

/** The URL to open, or null for anything but http and https (a registry typo must not run script). */
export function httpUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

const KIND_LABEL: Record<ItemKind, string> = {
  backlog: "Board card",
  project: "Project",
  plan: "Plan",
  dispatch: "Dispatch run",
  profile: "Profile",
  mcp: "MCP server",
  job: "Job",
  automation: "Automation",
  service: "Service",
  source: "Knowledge source",
  journal: "Journal entry",
  session: "Conversation",
};

// The console itself is where you already are, so it gets no tile and no entry.
const HIDDEN_APPS = new Set(["sazed-console"]);

/** The apps the Apps page shows and the palette offers, Apps group first, then Homelab. Both read
 * this one list, so the page and the palette cannot drift. */
export function launchableApps(services: Service[], privateRevealed: boolean): Service[] {
  const openable = services.filter(
    (s) =>
      s.open_url &&
      httpUrl(s.open_url) &&
      s.lifecycle !== "planned" &&
      !HIDDEN_APPS.has(s.id) &&
      (privateRevealed || !s.private)
  );
  return [...openable.filter((s) => s.group === "apps"), ...openable.filter((s) => s.group !== "apps")];
}

function appHint(s: Service): string {
  const host = s.open_url!.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const kind = statusOf(s);
  return kind === "down" ? `${host} · down` : kind === "maintenance" ? `${host} · in maintenance` : host;
}

function refHint(ref: ItemRef): string {
  return ref.version === undefined ? KIND_LABEL[ref.kind] : `${KIND_LABEL[ref.kind]} · v${ref.version}`;
}

function itemEntry(group: PaletteGroup, item: PaletteItem): PaletteEntry {
  return { kind: "item", key: `${group}:${item.ref.kind}:${item.ref.id}`, group, label: item.label, hint: item.hint, ref: item.ref };
}

/** The views worth their own entry: a one-view hub is already its Hubs entry, and the open
 * conversation is not a place to go. */
function placeViews(hub: (typeof HUBS)[number]) {
  if (hub.views.length < 2) return [];
  return hub.views.filter((v) => !(hub.id === "chat" && v.id === "conversation"));
}

interface Sources {
  recent: ItemRef[];
  services: Service[];
  privateRevealed: boolean;
  items: PaletteItem[];
  theme: ThemeChoice;
  shell: ShellKind;
}

/** Every entry in display order: Recent, Hubs, Apps, Views, Items, Actions. */
export function buildEntries({ recent, services, privateRevealed, items, theme, shell }: Sources): PaletteEntry[] {
  const entries: PaletteEntry[] = shownRecent(recent, services, privateRevealed).map((ref) =>
    itemEntry("Recent", { ref, label: ref.id, hint: refHint(ref) })
  );
  for (const hub of HUBS) {
    const hint = placeViews(hub).map((v) => v.label).join(", ");
    entries.push({ kind: "hub", key: `hub:${hub.id}`, group: "Hubs", label: hub.label, hint, hub: hub.id });
  }
  for (const s of launchableApps(services, privateRevealed)) {
    entries.push({ kind: "app", key: `app:${s.id}`, group: "Apps", label: s.name, hint: appHint(s), url: httpUrl(s.open_url!)! });
  }
  for (const hub of HUBS) {
    for (const view of placeViews(hub)) {
      entries.push({
        kind: "view",
        key: `view:${hub.id}:${view.id}`,
        group: "Views",
        label: view.label,
        hint: hub.label,
        target: { hub: hub.id, view: view.id } as NavTarget,
      });
    }
  }
  const recentKeys = new Set(recent.map((r) => `${r.kind}:${r.id}`));
  for (const item of items) {
    if (!recentKeys.has(`${item.ref.kind}:${item.ref.id}`)) entries.push(itemEntry("Items", item));
  }
  entries.push({ kind: "action", key: "action:settings", group: "Actions", label: "Settings", hint: "", action: "settings" });
  for (const choice of ["light", "dark", "system"] as const) {
    entries.push({
      kind: "action",
      key: `action:theme:${choice}`,
      group: "Actions",
      label: THEME_LABEL[choice],
      hint: choice === theme ? "Current" : "",
      action: `theme:${choice}`,
    });
  }
  entries.push({ kind: "action", key: "action:new-chat", group: "Actions", label: "New chat", hint: "", action: "new-chat" });
  const other: ShellKind = shell === "hubs" ? "old" : "hubs";
  entries.push({
    kind: "action",
    key: `action:shell:${other}`,
    group: "Actions",
    label: other === "hubs" ? "Switch to the new layout" : "Switch to the old layout",
    hint: "",
    action: `shell:${other}`,
  });
  return entries;
}

function matchScore(entry: PaletteEntry, q: string): number {
  const label = entry.label.toLowerCase();
  if (label === q) return 0;
  if (label.startsWith(q)) return 1;
  if (label.includes(q)) return 2;
  return 3;
}

/** Launchers win ties, so an app outranks a homelab service item that carries the same name. */
function kindRank(entry: PaletteEntry): number {
  return entry.kind === "app" ? 0 : entry.kind === "item" ? 2 : 1;
}

/** No query: everything but Items, in display order. A query: entries holding every word,
 * exact label first, then label prefix, then label substring, then a hint or group match. */
export function rankEntries(entries: PaletteEntry[], query: string): PaletteEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries.filter((e) => e.group !== "Items");
  const words = q.split(/\s+/);
  return entries
    .map((entry, index) => ({ entry, index, haystack: `${entry.label} ${entry.hint} ${entry.group}`.toLowerCase() }))
    .filter(({ haystack }) => words.every((w) => haystack.includes(w)))
    .map((r) => ({ ...r, score: matchScore(r.entry, q), rank: kindRank(r.entry) }))
    .sort((a, b) => a.score - b.score || a.rank - b.rank || a.index - b.index)
    .map((r) => r.entry);
}

/** Recent items minus services Pryce may not see now: until private services are revealed, a
 * service stays out unless the loaded list shows it is not private. */
function shownRecent(recent: ItemRef[], services: Service[], privateRevealed: boolean): ItemRef[] {
  if (privateRevealed) return recent;
  const visible = new Set(visibleServices(services, false).map((s) => s.id));
  return recent.filter((ref) => ref.kind !== "service" || visible.has(ref.id));
}

/** Homelab services as items that open their detail, private ones hidden as in launchableApps. */
export function serviceItems(services: Service[], privateRevealed: boolean): PaletteItem[] {
  return visibleServices(services, privateRevealed)
    .map((s) => {
      const kind = statusOf(s);
      const hint = kind === "down" ? "Service · down" : kind === "maintenance" ? "Service · in maintenance" : "Service";
      return { ref: { kind: "service", id: s.id }, label: s.name, hint };
    });
}

itemProviders.push(async () => serviceItems((await fetchServices()).services, useUiStore.getState().privateRevealed));
