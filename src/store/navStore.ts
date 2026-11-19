import { create } from "zustand";

import { HUB_VIEWS, firstView, isHub, isView, type HubId, type NavTarget, type ViewId, type ViewKey } from "@/nav/hubViews";

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
 * picker; a view with a second picker keys it `hub:view.name`. */
export const SUB_CHOICES = {
  "system:homelab": ["map", "list", "storage", "links"],
  "system:activity": ["all", "needs", "errors"],
  "system:usage": ["overview", "claude_code", "worker", "sazed_api"],
  "work:board.type": ["all", "idea", "bug", "gap", "optimization", "planned", "known_issue"],
  "work:plans": ["active", "draft", "done", "all"],
} as const satisfies Partial<Record<ViewKey | `${ViewKey}.${string}`, readonly [string, ...string[]]>>;

export type SubKey = keyof typeof SUB_CHOICES;
export type SubValue<K extends SubKey> = (typeof SUB_CHOICES)[K][number];
type Subs = { [K in SubKey]?: SubValue<K> };

export function isSub<K extends SubKey>(key: K, value: unknown): value is SubValue<K> {
  return typeof value === "string" && (SUB_CHOICES[key] as readonly string[]).includes(value);
}

export type Views = { [H in HubId]: ViewId<H> };
export type ItemsByView = Partial<Record<ViewKey, ItemRef>>;

interface NavState {
  hub: HubId;
  view: Views;
  sub: Subs;
  open: ItemsByView;
  read: ItemsByView;
  // A card's sheet opened over the view where it was tapped, keyed by that view rather than by the
  // card's own place, so the page stays underneath and Back closes the sheet first.
  sheet: ItemsByView;
  scroll: Record<string, number>;
  recent: ItemRef[];
  // Bumped when the active hub is tapped again, so the hub shell remounts the view and drops any
  // item a page holds in its own state.
  retaps: number;
  go: (hub: HubId, view?: string) => void;
  setSub: <K extends SubKey>(key: K, value: SubValue<K>) => void;
  setScroll: (hubView: string, top: number) => void;
  openItem: (ref: ItemRef) => void;
  closeItem: (kind: ItemKind) => void;
  openSheet: (ref: ItemRef) => void;
  closeSheet: () => void;
  clearItems: () => void;
  applyPlace: (place: Place) => void;
}

/** Where the console is: what a browser history entry restores. */
export type Place = Pick<NavState, "hub" | "view" | "open" | "read" | "sheet">;

const SHEET_KINDS: readonly ItemKind[] = ["backlog", "job"];

function currentView(s: Pick<NavState, "hub" | "view">): ViewKey {
  return `${s.hub}:${s.view[s.hub]}` as ViewKey;
}

function without(items: ItemsByView, key: ViewKey): ItemsByView {
  if (!items[key]) return items;
  const next = { ...items };
  delete next[key];
  return next;
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

export function loadViews(saved: unknown): Views {
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

/** The view that holds an item of this kind. */
export function itemView(kind: ItemKind): ViewKey {
  const { hub, view } = ITEM_PLACE[kind];
  return `${hub}:${view}` as ViewKey;
}

/** Keeps each saved item that is valid and filed under its own kind's view; anything else, such as
 * the older per-hub shape, is dropped. */
export function loadItems(saved: unknown): ItemsByView {
  const items: ItemsByView = {};
  if (saved && typeof saved === "object") {
    for (const [key, ref] of Object.entries(saved)) {
      if (isItemRef(ref) && itemView(ref.kind) === key) items[key as ViewKey] = ref;
    }
  }
  return items;
}

/** Keeps each saved card sheet that is valid and filed under a real view. */
export function loadSheets(saved: unknown): ItemsByView {
  const items: ItemsByView = {};
  if (saved && typeof saved === "object") {
    for (const [key, ref] of Object.entries(saved)) {
      const [hub, view = ""] = key.split(":");
      if (isItemRef(ref) && SHEET_KINDS.includes(ref.kind) && isHub(hub) && isView(hub, view)) items[key as ViewKey] = ref;
    }
  }
  return items;
}

function loadRecent(): ItemRef[] {
  const saved = readJson(() => sessionStorage, RECENT_KEY);
  return Array.isArray(saved) ? saved.filter(isItemRef).slice(0, RECENT_MAX) : [];
}

function withoutHub(items: ItemsByView, hub: HubId): ItemsByView {
  return Object.fromEntries(Object.entries(items).filter(([key]) => !key.startsWith(`${hub}:`)));
}

export const useNavStore = create<NavState>((set, get) => ({
  hub: "home",
  view: loadViews(readJson(() => localStorage, VIEW_KEY)),
  sub: loadSubs(readJson(() => localStorage, SUB_KEY)),
  open: {},
  read: {},
  sheet: {},
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
        open: withoutHub(s.open, hub),
        read: withoutHub(s.read, hub),
        sheet: withoutHub(s.sheet, hub),
        scroll: { ...s.scroll, [`${hub}:${first}`]: 0 },
        retaps: s.retaps + 1,
      });
      return;
    }
    const views = view === undefined ? s.view : { ...s.view, [hub]: view };
    writeJson(() => localStorage, VIEW_KEY, views);
    // A sheet belongs to the visit it was opened in; coming back by tab or rail starts without it.
    const left = currentView(s);
    const sheet = left === currentView({ hub, view: views }) ? s.sheet : without(s.sheet, left);
    set({ hub, view: views, sheet });
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
  // One set, so browser history sees opening an item in another view as one step.
  openItem: (ref) => {
    const place = ITEM_PLACE[ref.kind];
    const s = get();
    const views = { ...s.view, [place.hub]: place.view };
    writeJson(() => localStorage, VIEW_KEY, views);
    const recent = [ref, ...s.recent.filter((r) => r.kind !== ref.kind || r.id !== ref.id)].slice(0, RECENT_MAX);
    writeJson(() => sessionStorage, RECENT_KEY, recent);
    // A sheet opened over the item that is being replaced belonged to that item, and one over the
    // view being left belonged to that visit.
    const key = itemView(ref.kind);
    set({
      hub: place.hub,
      view: views,
      [place.slot]: { ...s[place.slot], [key]: ref },
      sheet: without(without(s.sheet, key), currentView(s)),
      recent,
    });
  },
  closeItem: (kind) => {
    const { slot } = ITEM_PLACE[kind];
    const key = itemView(kind);
    const s = get();
    const items = s[slot];
    if (items[key]?.kind !== kind) return;
    const next = { ...items };
    delete next[key];
    set({ [slot]: next, sheet: without(s.sheet, key) });
  },
  openSheet: (ref) => {
    const s = get();
    set({ sheet: { ...s.sheet, [currentView(s)]: ref } });
  },
  closeSheet: () => {
    const s = get();
    set({ sheet: without(s.sheet, currentView(s)) });
  },
  clearItems: () => set({ open: {}, read: {}, sheet: {} }),
  // Restores a history entry: no Recent, no retap.
  applyPlace: ({ hub, view, open, read, sheet }) => {
    writeJson(() => localStorage, VIEW_KEY, view);
    set({ hub, view, open, read, sheet });
  },
}));

/** The item on screen in the current view: a reader covers its view's page, so it wins over a
 * sheet or panel of the same view. */
export function shownItem(s: Place): ItemRef | null {
  const key = `${s.hub}:${s.view[s.hub]}` as ViewKey;
  return s.read[key] ?? s.open[key] ?? null;
}

/** A view's third-level choice: the saved one, else its default. */
export function useSub<K extends SubKey>(key: K): SubValue<K> {
  return useNavStore((s) => s.sub[key] ?? SUB_CHOICES[key][0]) as SubValue<K>;
}
