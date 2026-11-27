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
  /** "orchestrator" or null; absent from a Sazed before slice 4. */
  role?: string | null;
}

const CLAUDE_CODE = "https://claude.ai/code";

/** Where "Talk to orchestrator" and "Open in Claude" go. Check A0 has not shown that a hook's
 * session id is the id in `claude.ai/code/<id>`, so every session opens the session list; once it
 * does, return `${CLAUDE_CODE}/${session.session_id}`. */
export function claudeLink(_session: Pick<Session, "session_id">): string {
  return CLAUDE_CODE;
}

export const isOrchestrator = (session: Pick<Session, "role"> | null | undefined): boolean => session?.role === "orchestrator";

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

// Dev only: `localStorage["sazed-mock-sessions"] = "1"` serves fixtures (src/mock/sessions.ts) in
// place of the session fields, so the pages can be driven before any hook reports. Callers test
// import.meta.env.DEV themselves, so a production build drops the fixtures' chunk.
export function mockingSessions(): boolean {
  try {
    return localStorage.getItem("sazed-mock-sessions") === "1";
  } catch {
    return false;
  }
}

export async function getSession(id: string): Promise<SessionDetail> {
  if (import.meta.env.DEV && mockingSessions()) {
    const found = (await import("@/mock/sessions")).mockSessionDetail(id);
    if (found) return found;
  }
  const raw = (await apiFetch(`/sessions/${encodeURIComponent(id)}`)) as SessionDetail;
  const agents = Array.isArray(raw.agents)
    ? raw.agents.filter((a) => a && typeof a === "object").map((a) => ({ ...a, steps: Array.isArray(a.steps) ? a.steps : [] }))
    : [];
  return { ...raw, ...readSession(raw), agents };
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const LINKS = new Set(["card_id", "branch", "ambiguous", "unknown_card", "none"]);

/** One session row with every field the console reads made safe, or null when it has no id or
 * last-heard time. One malformed row degrades alone instead of breaking Home. */
export function readSession(raw: unknown): Session | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.session_id !== "string" || typeof s.last_heard_at !== "string") return null;
  const link = (s.link ?? {}) as Record<string, unknown>;
  const card = s.card as Record<string, unknown> | null;
  const project = s.project as Record<string, unknown> | null;
  const question = s.question as Record<string, unknown> | null;
  return {
    ...(s as unknown as Session),
    host: str(s.host),
    repo: str(s.repo),
    branch: str(s.branch),
    started_at: str(s.started_at) ?? s.last_heard_at,
    state: str(s.state) ?? "",
    status: str(s.status) ?? "",
    doing: str(s.doing),
    doing_source: str(s.doing_source),
    role: str(s.role) ?? undefined,
    question:
      question && typeof question === "object"
        ? { text: str(question.text) ?? "", agent_id: str(question.agent_id), asked_at: str(question.asked_at) ?? s.last_heard_at }
        : null,
    link: {
      status: LINKS.has(link.status as string) ? (link.status as Session["link"]["status"]) : "none",
      card_id: str(link.card_id),
      candidates: Array.isArray(link.candidates) ? link.candidates.filter((c): c is string => typeof c === "string") : [],
    },
    card:
      card && typeof card === "object" && typeof card.id === "string" && typeof card.title === "string"
        ? { id: card.id, title: card.title, stage: str(card.stage) ?? "", next: str(card.next) ?? "" }
        : null,
    project:
      project && typeof project === "object" && typeof project.slug === "string"
        ? { slug: project.slug, title: str(project.title) ?? project.slug }
        : null,
  };
}

/** A Sazed before slice 3 sends neither key, and a malformed value must not break Home: both read
 * as absent, and a malformed row is dropped or made safe on its own. */
export function readSessionFields(raw: { sessions?: unknown; session_health?: unknown }): {
  sessions: Session[] | undefined;
  session_health: SessionHealth | undefined;
} {
  const sessions = Array.isArray(raw.sessions)
    ? (raw.sessions as unknown[]).map(readSession).filter((s): s is Session => s !== null)
    : undefined;
  const h = raw.session_health as SessionHealth | null | undefined;
  const session_health =
    h && typeof h === "object" && Array.isArray(h.stale_card_ids)
      ? { ...h, stale_card_ids: h.stale_card_ids.filter((id) => typeof id === "string") }
      : undefined;
  return { sessions, session_health };
}
