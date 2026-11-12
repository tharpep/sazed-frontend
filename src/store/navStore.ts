import { create } from "zustand";

import { HUB_VIEWS, firstView, isView, type HubId, type NavTarget, type ViewId } from "@/nav/hubViews";

export type ItemKind =
  | "backlog"
  | "project"
  | "plan"
  | "dispatch"
  | "profile"
  | "mcp"
  | "job"
  | "automation"
  | "service"
  | "source"
  | "journal"
  | "session";

export interface ItemRef {
  kind: ItemKind;
  id: string;
  version?: number;
}

type Slot = "open" | "read";

const ITEM_PLACE: Record<ItemKind, NavTarget & { slot: Slot }> = {
  backlog: { hub: "work", view: "board", slot: "open" },
  project: { hub: "work", view: "projects", slot: "open" },
  plan: { hub: "work", view: "plans", slot: "read" },
  dispatch: { hub: "agents", view: "runs", slot: "read" },
  profile: { hub: "agents", view: "profiles", slot: "open" },
  mcp: { hub: "agents", view: "mcp", slot: "open" },
  job: { hub: "agents", view: "runs", slot: "open" },
  automation: { hub: "agents", view: "automations", slot: "open" },
  service: { hub: "system", view: "homelab", slot: "open" },
  source: { hub: "library", view: "knowledge", slot: "open" },
  journal: { hub: "library", view: "journal", slot: "read" },
  session: { hub: "chat", view: "conversation", slot: "open" },
};

const RECENT_MAX = 8;
const VIEW_KEY = "sazed-nav-view";
const RECENT_KEY = "sazed-nav-recent";

type Views = { [H in HubId]: ViewId<H> };
type ItemsByHub = Partial<Record<HubId, ItemRef>>;

interface NavState {
  hub: HubId;
  view: Views;
  open: ItemsByHub;
  read: ItemsByHub;
  scroll: Record<string, number>;
  recent: ItemRef[];
  go: (hub: HubId, view?: string) => void;
  openItem: (ref: ItemRef) => void;
  closeItem: () => void;
  clearItems: () => void;
}

function readJson(storage: () => Storage, key: string): unknown {
  try {
    const raw = storage().getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: () => Storage, key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function loadViews(): Views {
  const saved = readJson(() => localStorage, VIEW_KEY);
  const views = Object.fromEntries(HUB_VIEWS.map((h) => [h.id, firstView(h.id)])) as Views;
  if (saved && typeof saved === "object") {
    for (const hub of HUB_VIEWS.map((h) => h.id)) {
      const id = (saved as Record<string, unknown>)[hub];
      if (typeof id === "string" && isView(hub, id)) (views as Record<HubId, string>)[hub] = id;
    }
  }
  return views;
}

function isItemRef(r: unknown): r is ItemRef {
  if (!r || typeof r !== "object") return false;
  const { kind, id, version } = r as Record<string, unknown>;
  return (
    typeof kind === "string" &&
    Object.prototype.hasOwnProperty.call(ITEM_PLACE, kind) &&
    typeof id === "string" &&
    id !== "" &&
    (version === undefined || Number.isInteger(version))
  );
}

function loadRecent(): ItemRef[] {
  const saved = readJson(() => sessionStorage, RECENT_KEY);
  return Array.isArray(saved) ? saved.filter(isItemRef).slice(0, RECENT_MAX) : [];
}

function without(items: ItemsByHub, hub: HubId): ItemsByHub {
  const next = { ...items };
  delete next[hub];
  return next;
}

export const useNavStore = create<NavState>((set, get) => ({
  hub: "home",
  view: loadViews(),
  open: {},
  read: {},
  scroll: {},
  recent: loadRecent(),
  go: (hub, view) => {
    const s = get();
    if (view !== undefined && !isView(hub, view)) view = undefined;
    if (hub === s.hub && view === undefined) {
      const first = firstView(hub);
      const views = { ...s.view, [hub]: first };
      writeJson(() => localStorage, VIEW_KEY, views);
      set({
        view: views,
        open: without(s.open, hub),
        read: without(s.read, hub),
        scroll: { ...s.scroll, [`${hub}:${first}`]: 0 },
      });
      return;
    }
    const views = view === undefined ? s.view : { ...s.view, [hub]: view };
    writeJson(() => localStorage, VIEW_KEY, views);
    set({ hub, view: views });
  },
  openItem: (ref) => {
    const place = ITEM_PLACE[ref.kind];
    get().go(place.hub, place.view);
    const s = get();
    const recent = [ref, ...s.recent.filter((r) => r.kind !== ref.kind || r.id !== ref.id)].slice(0, RECENT_MAX);
    writeJson(() => sessionStorage, RECENT_KEY, recent);
    set({ [place.slot]: { ...s[place.slot], [place.hub]: ref }, recent });
  },
  closeItem: () => {
    const s = get();
    if (s.open[s.hub]) set({ open: without(s.open, s.hub) });
    else if (s.read[s.hub]) set({ read: without(s.read, s.hub) });
  },
  clearItems: () => set({ open: {}, read: {} }),
}));
