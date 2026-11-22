import { useEffect, useSyncExternalStore } from "react";

import { ApiError } from "@/api/client";
import { getSession, type Session, type SessionDetail } from "@/api/sessions";

// One cache and one throttle for every reader of GET /sessions/{id} (Home's rows, the steps
// sheet, the card sheet's Now), so a sheet open over Home never doubles the requests for an id.
const EVERY_MS = 10_000;

export interface DetailState {
  detail: SessionDetail | null;
  /** "gone" is a 404, never asked again; "failed" is tried again after EVERY_MS. */
  error: "gone" | "failed" | null;
}

interface Entry extends DetailState {
  at: number;
  heard: string | null;
  seq: number;
  inflight: boolean;
}

const EMPTY: DetailState = { detail: null, error: null };
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
const snapshots = new Map<string, DetailState>();
let version = 0;

function emit(id: string) {
  const e = cache.get(id);
  snapshots.set(id, e ? { detail: e.detail, error: e.error } : EMPTY);
  version += 1;
  for (const l of listeners) l();
}

/** Asks Sazed for a session's detail unless a request is in flight, the last one was under 10 s
 * ago, or the id answered 404 and Sazed has not heard from it since. `heard` also skips a session
 * Sazed has not heard from since the last answer. */
export function loadSessionDetail(id: string, heard: string | null = null) {
  const now = Date.now();
  const e = cache.get(id);
  // A 404 during a Sazed redeploy must not hide a session until reload: a newer last-heard time
  // asks again.
  const gone = e?.error === "gone" && (heard === null || heard === e.heard);
  if (e && (e.inflight || gone || now - e.at < EVERY_MS)) return;
  if (e && heard !== null && e.heard === heard && e.detail) return;
  const seq = (e?.seq ?? 0) + 1;
  cache.set(id, { detail: e?.detail ?? null, error: e?.error ?? null, at: now, heard: e?.heard ?? null, seq, inflight: true });
  getSession(id).then(
    (detail) => {
      const cur = cache.get(id);
      // An answer older than the newest request must not overwrite it.
      if (!cur || cur.seq !== seq) return;
      cache.set(id, { ...cur, detail, error: null, heard: detail.last_heard_at, inflight: false });
      emit(id);
    },
    (err) => {
      const cur = cache.get(id);
      if (!cur || cur.seq !== seq) return;
      const gone = err instanceof ApiError && err.status === 404;
      cache.set(id, { ...cur, error: gone ? "gone" : "failed", heard: heard ?? cur.heard, at: Date.now(), inflight: false });
      emit(id);
    }
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read(id: string | null): DetailState {
  return id ? (snapshots.get(id) ?? EMPTY) : EMPTY;
}

/** One session's detail, polled every 10 s while `id` is set and the page is visible. */
export function useSessionDetail(id: string | null): DetailState {
  const state = useSyncExternalStore(subscribe, () => read(id));
  useEffect(() => {
    if (!id) return;
    watched.set(id, (watched.get(id) ?? 0) + 1);
    loadSessionDetail(id);
    const timer = setInterval(() => !document.hidden && loadSessionDetail(id), EVERY_MS);
    return () => {
      clearInterval(timer);
      const n = (watched.get(id) ?? 1) - 1;
      if (n > 0) watched.set(id, n);
      else watched.delete(id);
    };
  }, [id]);
  return state;
}

const watched = new Map<string, number>();

/** Forgets every session that is neither live nor open in a sheet, so the cache stays the size of
 * the live list. */
export function pruneSessionDetails(liveIds: ReadonlySet<string>) {
  for (const id of [...cache.keys()]) {
    if (liveIds.has(id) || watched.has(id)) continue;
    cache.delete(id);
    snapshots.delete(id);
  }
}

/** Home's agent rows: only running sessions can have agents worth a row, so only they are fetched,
 * and again only once Sazed has heard from them since. Driven by the command poll. */
export function useRunningDetails(sessions: readonly Session[] | undefined): Record<string, SessionDetail> {
  useSyncExternalStore(subscribe, () => version);
  useEffect(() => {
    if (!sessions) return;
    pruneSessionDetails(new Set(sessions.map((s) => s.session_id)));
    for (const s of sessions) if (s.status === "running") loadSessionDetail(s.session_id, s.last_heard_at);
  }, [sessions]);
  const out: Record<string, SessionDetail> = {};
  for (const s of sessions ?? []) {
    const d = snapshots.get(s.session_id)?.detail;
    if (d) out[s.session_id] = d;
  }
  return out;
}
