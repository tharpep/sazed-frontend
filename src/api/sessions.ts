import { apiFetch } from "./client";

// Mirrors sazed app/sessions/service.py (plans/board-visibility-2026-11-19/slice-3-contract.md).
// State words stay plain strings where a newer Sazed may add one: an unknown word must still render.

export type SessionStatus = "running" | "idle" | "ended" | "not_heard_from";

export interface SessionQuestion {
  text: string;
  /** The subagent that asked, or null for the main thread. */
  agent_id: string | null;
  asked_at: string;
}

export interface SessionCardLink {
  status: "card_id" | "branch" | "ambiguous" | "unknown_card" | "none";
  card_id: string | null;
  candidates: string[];
}

export interface Session {
  session_id: string;
  host: string | null;
  cwd: string | null;
  repo: string | null;
  branch: string | null;
  started_at: string;
  last_heard_at: string;
  ended_at: string | null;
  state: string;
  status: string;
  doing: string | null;
  doing_source: string | null;
  doing_at: string | null;
  question: SessionQuestion | null;
  link: SessionCardLink;
  card: { id: string; title: string; stage: string; next: string } | null;
  project: { slug: string; title: string } | null;
  pr: unknown;
}

export interface SessionStep {
  /** Unix seconds from the hook; display times use `at`. */
  ts: number;
  at: string;
  seq: number;
  kind: string;
  tool: string | null;
  target: string | null;
  text: string;
  error: boolean;
}

export interface SessionAgent {
  /** null is the main thread. */
  agent_id: string | null;
  agent_type: string | null;
  /** The main thread's is the session's state; a subagent is "running" or "done". */
  state: string;
  first_at: string | null;
  last_at: string | null;
  /** Oldest first, at most steps_per_agent. */
  steps: SessionStep[];
}

export interface SessionDetail extends Session {
  agents: SessionAgent[];
  steps_per_agent: number;
  silent_after_s: number;
  idle_silent_after_s: number;
  now: string;
}

export interface SessionHealth {
  silent_after_s: number;
  idle_silent_after_s: number;
  /** The newest last_heard_at of any session ever, or null when none has reported. */
  last_heard_at: string | null;
  stale_card_ids: string[];
}

export interface SessionList {
  live: Session[];
  recent: Session[];
  silent_after_s: number;
  idle_silent_after_s: number;
  window_hours: number;
  now: string;
}

// Dev only: `localStorage["sazed-mock-sessions"] = "1"` serves fixtures (src/mock/sessions.ts) in
// place of the session fields, so the pages can be driven before any hook reports.
export function mockingSessions(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem("sazed-mock-sessions") === "1";
  } catch {
    return false;
  }
}

export function getSessions(): Promise<SessionList> {
  return apiFetch("/sessions") as Promise<SessionList>;
}

export async function getSession(id: string): Promise<SessionDetail> {
  if (mockingSessions()) {
    const found = (await import("@/mock/sessions")).mockSessionDetail(id);
    if (found) return found;
  }
  return apiFetch(`/sessions/${encodeURIComponent(id)}`) as Promise<SessionDetail>;
}

/** A Sazed before slice 3 sends neither key, and a malformed value must not break Home: both read
 * as absent. */
export function readSessionFields(raw: { sessions?: unknown; session_health?: unknown }): {
  sessions: Session[] | undefined;
  session_health: SessionHealth | undefined;
} {
  const sessions = Array.isArray(raw.sessions)
    ? (raw.sessions as unknown[]).filter(
        (s): s is Session =>
          typeof s === "object" && s !== null && typeof (s as Session).session_id === "string" && typeof (s as Session).last_heard_at === "string"
      )
    : undefined;
  const h = raw.session_health as SessionHealth | null | undefined;
  const session_health =
    h && typeof h === "object" && Array.isArray(h.stale_card_ids)
      ? { ...h, stale_card_ids: h.stale_card_ids.filter((id) => typeof id === "string") }
      : undefined;
  return { sessions, session_health };
}
