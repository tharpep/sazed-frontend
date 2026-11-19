import { useEffect } from "react";

import { isHub } from "@/nav/hubViews";
import { loadItems, loadSheets, loadViews, shownItem, useNavStore, type ItemRef, type ItemsByView, type Place } from "@/store/navStore";

/** What one browser history entry holds: the place, and the place of the entry beneath it when
 * this console pushed that entry (null for the first entry of a load or a deep link). */
export interface Entry {
  place: Place;
  below: Place | null;
}

export type Step = "push" | "back" | "replace" | null;

/** Why the store changed: navigation, a write that follows other state, or an in-app Back control. */
export type Intent = "navigate" | "follow" | "back";

// history.state is shared with react-router's BrowserRouter, so the entry lives under its own key.
const KEY = "sazed";

export function placeOf(s: Place): Place {
  return { hub: s.hub, view: s.view, open: s.open, read: s.read, sheet: s.sheet };
}

function sameRef(a: ItemRef | undefined, b: ItemRef | undefined): boolean {
  return a?.kind === b?.kind && a?.id === b?.id && a?.version === b?.version;
}

function sameItems(a: ItemsByView, b: ItemsByView): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof ItemsByView>;
  return [...keys].every((k) => sameRef(a[k], b[k]));
}

export function samePlace(a: Place, b: Place): boolean {
  if (a.hub !== b.hub || !sameItems(a.open, b.open) || !sameItems(a.read, b.read) || !sameItems(a.sheet, b.sheet)) return false;
  return (Object.keys(a.view) as (keyof Place["view"])[]).every((h) => a.view[h] === b.view[h]);
}

// An item that appears or changes to another id is navigation; a new version of the same item is
// the plan's version picker.
function opened(prev: ItemsByView, next: ItemsByView): boolean {
  return (Object.keys(next) as (keyof ItemsByView)[]).some(
    (k) => next[k]!.kind !== prev[k]?.kind || next[k]!.id !== prev[k]?.id
  );
}

// The entry beneath can hold a conversation Chat named after it was pushed, so landing on it is
// judged by what is on screen.
function sameScreen(a: Place, b: Place): boolean {
  return a.hub === b.hub && a.view[a.hub] === b.view[b.hub] && sameRef(shownItem(a) ?? undefined, shownItem(b) ?? undefined);
}

function closed(prev: Place, next: Place): boolean {
  return (
    prev.hub === next.hub &&
    prev.view[prev.hub] === next.view[next.hub] &&
    shownItem(prev) !== null &&
    shownItem(next) === null
  );
}

/** How a store change shows in history. A close of the shown item, or an in-app Back control, that
 * lands on the screen beneath goes back, so it leaves no extra entry. Otherwise moving to another
 * hub or view (tabs, rail, palette) or opening an item pushes, and anything else rewrites the
 * current entry. */
export function stepFor(prev: Place, next: Place, below: Place | null, intent: Intent = "navigate"): Step {
  if (samePlace(prev, next)) return null;
  if (intent === "follow") return "replace";
  const landsBelow = below !== null && next.hub === prev.hub && sameScreen(below, next);
  if (landsBelow && (intent === "back" || closed(prev, next))) return "back";
  const navigated =
    next.hub !== prev.hub ||
    next.view[next.hub] !== prev.view[next.hub] ||
    opened(prev.open, next.open) ||
    opened(prev.read, next.read) ||
    opened(prev.sheet, next.sheet);
  return navigated ? "push" : "replace";
}

const CHAT = "chat:conversation";

/** What a history entry restores. Its conversation is restored only when that conversation is its
 * screen: any other entry keeps the live one, so Back never loads an older conversation over a
 * reply that is still streaming. */
export function placeToApply(entry: Place, live: Place): Place {
  if (shownItem(entry)?.kind === "session") return entry;
  const open = { ...entry.open };
  if (live.open[CHAT]) open[CHAT] = live.open[CHAT];
  else delete open[CHAT];
  return { ...entry, open };
}

function parsePlace(raw: unknown): Place | null {
  if (!raw || typeof raw !== "object") return null;
  const { hub, view, open, read, sheet } = raw as Record<string, unknown>;
  if (typeof hub !== "string" || !isHub(hub)) return null;
  return { hub, view: loadViews(view), open: loadItems(open), read: loadItems(read), sheet: loadSheets(sheet) };
}

/** The console's entry in a history.state, or null when the state is not one (another app's, a
 * deep link's cleared state). Items that no longer validate are dropped. */
export function parseEntry(state: unknown): Entry | null {
  const raw = state && typeof state === "object" ? (state as Record<string, unknown>)[KEY] : null;
  if (!raw || typeof raw !== "object") return null;
  const place = parsePlace((raw as Record<string, unknown>).place);
  if (!place) return null;
  return { place, below: parsePlace((raw as Record<string, unknown>).below) };
}

let intent: Intent = "navigate";

function withIntent(next: Intent, write: () => void) {
  intent = next;
  try {
    write();
  } finally {
    intent = "navigate";
  }
}

/** Runs a store write that follows other state rather than navigating (the chat store naming its
 * conversation, a page dropping an item that failed to load): it rewrites the current entry. */
export function withoutEntry(write: () => void) {
  withIntent("follow", write);
}

/** Runs the write behind an in-app Back control: when it lands on the screen beneath, history goes
 * back instead of adding an entry. */
export function backInHistory(write: () => void) {
  withIntent("back", write);
}

/** Mirrors navStore into browser history: pushState for navigation, back() for an in-app close of
 * a pushed item, replaceState otherwise, and popstate applies the entry. Returns the stop. */
export function startHistorySync(): () => void {
  let current: Entry;
  let applying = false;

  const write = (entry: Entry, push: boolean) => {
    const state = { ...(push ? null : window.history.state), [KEY]: entry };
    if (push) window.history.pushState(state, "");
    else window.history.replaceState(state, "");
  };

  const apply = (entry: Entry, initial: boolean) => {
    const nav = useNavStore.getState();
    const place = initial ? entry.place : placeToApply(entry.place, placeOf(nav));
    if (!samePlace(placeOf(nav), place)) {
      applying = true;
      try {
        nav.applyPlace(place);
      } finally {
        applying = false;
      }
    }
    // A subscriber that corrects the store while it is applied (Chat naming its conversation) must
    // land in this entry rather than add one.
    const now = placeOf(useNavStore.getState());
    current = { place: now, below: entry.below };
    if (!samePlace(now, entry.place)) write(current, false);
  };

  const saved = parseEntry(window.history.state);
  if (saved) apply(saved, true);
  else {
    current = { place: placeOf(useNavStore.getState()), below: null };
    write(current, false);
  }

  const offNav = useNavStore.subscribe((s) => {
    if (applying) return;
    const next = placeOf(s);
    const step = stepFor(current.place, next, current.below, intent);
    if (step === "push") {
      current = { place: next, below: current.place };
      write(current, true);
    } else if (step === "back") {
      current = { place: next, below: null };
      window.history.back();
    } else if (step === "replace") {
      current = { ...current, place: next };
      write(current, false);
    }
  });

  const onPop = (e: PopStateEvent) => {
    const entry = parseEntry(e.state);
    if (entry) apply(entry, false);
  };
  window.addEventListener("popstate", onPop);

  return () => {
    offNav();
    window.removeEventListener("popstate", onPop);
  };
}

/** Mounted after App, so App's deep link has landed and cleared the URL before the first entry. */
export function HistorySync() {
  useEffect(startHistorySync, []);
  return null;
}
