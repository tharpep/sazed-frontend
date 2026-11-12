import { create } from "zustand";

import { HUB_VIEWS, firstView, isView, type HubId, type NavTarget, type ViewId, type ViewKey } from "@/nav/hubViews";

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
const SUB_KEY = "sazed-nav-sub";
const RECENT_KEY = "sazed-nav-recent";

/** Each view's third-level choices (its ViewPicker), default first. A view with no entry has no
 * picker. */
export const SUB_CHOICES = {
  "system:homelab": ["map", "list", "storage", "links"],
  "system:activity": ["all", "needs", "errors"],
  "system:usage": ["overview", "claude_code", "worker", "sazed_api"],
} as const satisfies Partial<Record<ViewKey, readonly [string, ...string[]]>>;

export type SubKey = keyof typeof SUB_CHOICES;
export type SubValue<K extends SubKey> = (typeof SUB_CHOICES)[K][number];
type Subs = { [K in SubKey]?: SubValue<K> };

export function isSub<K extends SubKey>(key: K, value: unknown): value is SubValue<K> {
  return typeof value === "string" && (SUB_CHOICES[key] as readonly string[]).includes(value);
}

type Views = { [H in HubId]: ViewId<H> };
type ItemsByHub = Partial<Record<HubId, ItemRef>>;

interface NavState {
  hub: HubId;
  view: Views;
  sub: Subs;
  open: ItemsByHub;
  read: ItemsByHub;
  scroll: Record<string, number>;
  recent: ItemRef[];
  // Bumped when the active hub is tapped again, so the hub shell remounts the view and drops any
  // item a page holds in its own state.
  retaps: number;
  go: (hub: HubId, view?: string) => void;
  setSub: <K extends SubKey>(key: K, value: SubValue<K>) => void;
  setScroll: (hubView: string, top: number) => void;
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

export function loadSubs(saved: unknown): Subs {
  const subs: Record<string, string> = {};
  if (saved && typeof saved === "object") {
    for (const key of Object.keys(SUB_CHOICES) as SubKey[]) {
      const value = (saved as Record<string, unknown>)[key];
      if (isSub(key, value)) subs[key] = value;
    }
  }
  return subs as Subs;
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
  sub: loadSubs(readJson(() => localStorage, SUB_KEY)),
  open: {},
  read: {},
  scroll: {},
  recent: loadRecent(),
  retaps: 0,
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
        retaps: s.retaps + 1,
      });
      return;
    }
    const views = view === undefined ? s.view : { ...s.view, [hub]: view };
    writeJson(() => localStorage, VIEW_KEY, views);
    set({ hub, view: views });
  },
  setSub: (key, value) => {
    if (!isSub(key, value) || get().sub[key] === value) return;
    const sub = { ...get().sub, [key]: value };
    writeJson(() => localStorage, SUB_KEY, sub);
    set({ sub });
  },
  setScroll: (hubView, top) => {
    if (get().scroll[hubView] !== top) set({ scroll: { ...get().scroll, [hubView]: top } });
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

/** A view's third-level choice: the saved one, else its default. */
export function useSub<K extends SubKey>(key: K): SubValue<K> {
  return useNavStore((s) => s.sub[key] ?? SUB_CHOICES[key][0]) as SubValue<K>;
}
