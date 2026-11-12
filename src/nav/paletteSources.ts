import { create } from "zustand";

import type { Service } from "@/api/homelab";
import { statusOf } from "@/features/homelab/format";
import type { ItemKind, ItemRef } from "@/store/navStore";
import { HUBS } from "./hubs";
import type { HubId, NavTarget } from "./hubViews";

export type PaletteGroup = "Recent" | "Hubs" | "Apps" | "Views" | "Items" | "Actions";
export type PaletteAction = "settings" | "theme" | "new-chat";

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

// The same filter AppGrid applies today, so the palette offers exactly the Apps page's tiles.
// Slice 6 owns AppGrid.tsx; it can make AppGrid import this instead of keeping its own copy.
const HIDDEN_APPS = new Set(["sazed-console"]);

export function launchableApps(services: Service[], privateRevealed: boolean): Service[] {
  const openable = services.filter(
    (s) => s.open_url && s.lifecycle !== "planned" && !HIDDEN_APPS.has(s.id) && (privateRevealed || !s.private)
  );
  // AppGrid shows its Apps section before its Homelab section; keep that order.
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

interface Sources {
  recent: ItemRef[];
  services: Service[];
  privateRevealed: boolean;
  items: PaletteItem[];
}

/** Every entry in display order: Recent, Hubs, Apps, Views, Items, Actions. */
export function buildEntries({ recent, services, privateRevealed, items }: Sources): PaletteEntry[] {
  const entries: PaletteEntry[] = recent.map((ref) =>
    itemEntry("Recent", { ref, label: ref.id, hint: refHint(ref) })
  );
  for (const hub of HUBS) {
    const hint = hub.views.length > 1 ? hub.views.map((v) => v.label).join(", ") : "";
    entries.push({ kind: "hub", key: `hub:${hub.id}`, group: "Hubs", label: hub.label, hint, hub: hub.id });
  }
  for (const s of launchableApps(services, privateRevealed)) {
    entries.push({ kind: "app", key: `app:${s.id}`, group: "Apps", label: s.name, hint: appHint(s), url: s.open_url! });
  }
  for (const hub of HUBS) {
    // A one-view hub is already its Hubs entry, and the open conversation is not a place to go.
    if (hub.views.length < 2) continue;
    for (const view of hub.views) {
      if (hub.id === "chat" && view.id === "conversation") continue;
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
  entries.push(
    { kind: "action", key: "action:settings", group: "Actions", label: "Settings", hint: "", action: "settings" },
    { kind: "action", key: "action:theme", group: "Actions", label: "Switch light or dark", hint: "", action: "theme" },
    { kind: "action", key: "action:new-chat", group: "Actions", label: "New chat", hint: "", action: "new-chat" }
  );
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
