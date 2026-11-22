import type { Project, ProjectCard } from "@/api/projects";
import type { Session, SessionAgent, SessionStep } from "@/api/sessions";
import { sessionLabel } from "@/widgets/projectWork";

import { ageSince, heardLabel } from "./heard";

const SOURCE_WORD: Record<string, string> = { task: "task list", commit: "last commit", pr: "PR" };

/** Where a doing line came from, in words: "task list", "last commit", "PR". */
export function sourceWord(source: string | null | undefined): string | null {
  return source ? (SOURCE_WORD[source] ?? source) : null;
}

/** Sazed's word for a session the hooks have gone quiet on; the only status shown as a warning. */
export const NOT_HEARD = "not_heard_from";

export function isWarn(status: string | null | undefined): boolean {
  return status === NOT_HEARD;
}

/** What the row's right column says above its last-heard line. */
export function statusWord(status: string): string | null {
  if (status === "idle") return "idle";
  if (status === NOT_HEARD) return "not heard from";
  if (status === "ended") return "ended";
  return null;
}

const MAIN_BRANCH = new Set(["main", "master"]);

/** A session's name on its row: its card, else its branch, else its repo, else its short id. */
export function sessionTitle(s: Pick<Session, "card" | "branch" | "repo" | "session_id">): string {
  if (s.card) return s.card.title;
  if (s.branch && !MAIN_BRANCH.has(s.branch)) return s.branch;
  if (s.repo) return s.repo.split("/").pop()!;
  return `Session ${sessionLabel(s.session_id)}`;
}

/** The meta line's lead: the project, or why there is no card. */
export function linkWord(s: Pick<Session, "card" | "project" | "link">): string {
  if (s.card) return s.project?.title ?? "No step";
  if (s.link?.status === "ambiguous") return s.link.candidates?.length ? `${s.link.candidates.length} cards match` : "several cards match";
  if (s.link?.status === "unknown_card") return "card not on the board";
  return "no card";
}

const RANK: Record<string, number> = { running: 1, [NOT_HEARD]: 2, idle: 3 };

/** A session asking a question first, then running, gone quiet and idle; Sazed's newest-heard
 * order holds within each. */
export function orderSessions(sessions: readonly Session[]): Session[] {
  const rank = (s: Session) => (s.question ? 0 : (RANK[s.status] ?? 4));
  return sessions
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i)
    .map(({ s }) => s);
}

/** "3h 50m" or "12m" since an ISO time. */
export function span(iso: string | null | undefined, now = Date.now()): string {
  const age = ageSince(iso, now);
  if (age === null) return "";
  const m = Math.floor(age / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

/** The last-heard line and whether it reads as a warning. A warning comes from Sazed's status,
 * never from the console's own clock. */
export function heardOf(lastHeard: string | null | undefined, status: string | null | undefined, now = Date.now()) {
  return { text: heardLabel(ageSince(lastHeard, now)), warn: isWarn(status) };
}

/** A session's questions count once each under Needs you. */
export function questionCount(sessions: readonly Session[] | undefined): number {
  return (sessions ?? []).filter((s) => s.question).length;
}

export function agentName(agent: Pick<SessionAgent, "agent_id" | "agent_type">): string {
  if (agent.agent_id === null) return "Main thread";
  return agent.agent_type || `Agent ${agent.agent_id.slice(0, 6)}`;
}

/** The subagents of a session, oldest first as Sazed orders them; the main thread is the row itself. */
export function subagents(agents: readonly SessionAgent[] | undefined): SessionAgent[] {
  return (agents ?? []).filter((a) => a.agent_id !== null);
}

const KIND_WORD: Record<string, string> = {
  prompt: "Prompt",
  doing: "Doing",
  question: "Asked",
  start: "Started",
  stop: "Stopped",
  agent_start: "Agent started",
  agent_stop: "Agent finished",
  end: "Ended",
};

/** One step as head (tool or kind), target and its one result line. */
export function stepText(step: SessionStep): { head: string; target: string; line: string } {
  if (step.kind === "tool") return { head: step.tool || "Tool", target: step.target ?? "", line: step.text };
  return { head: KIND_WORD[step.kind] ?? step.kind, target: step.target ?? "", line: step.text };
}

/** An agent's row line: its newest tool call, else its newest line of text. */
export function agentLine(agent: SessionAgent): string {
  for (let i = agent.steps.length - 1; i >= 0; i -= 1) {
    const step = agent.steps[i];
    if (step.kind === "tool") return [step.tool, step.target].filter(Boolean).join(" ");
    if (step.text) return step.text;
  }
  return agent.state === "done" ? "Finished" : "Started";
}

export const STEPS_SHOWN = 8;

/** The steps a sheet shows, newest last: the newest `shown`, or every one once expanded. */
export function visibleSteps<T>(steps: readonly T[], expanded: boolean, shown = STEPS_SHOWN): { earlier: number; rows: T[] } {
  if (expanded || steps.length <= shown) return { earlier: 0, rows: [...steps] };
  return { earlier: steps.length - shown, rows: steps.slice(steps.length - shown) };
}

export interface StaleStep {
  slug: string;
  project: string;
  step: string;
  count: number;
}

const withPrefix = (id: string) => (id.startsWith("item:") ? id : `item:${id}`);

/** The steps holding the stale "being built" cards, most cards first. Cards whose step is not
 * known yet (board or projects still loading, or a card on no step) are left out. */
export function staleSteps(
  staleIds: readonly string[],
  cards: readonly ProjectCard[] | null,
  projects: readonly Project[] | null
): StaleStep[] {
  if (!cards || !projects) return [];
  const stepOf = new Map(
    projects.flatMap((p) => p.workstreams.map((w) => [w.id, { slug: p.slug, project: p.title, step: w.title }] as const))
  );
  const byId = new Map(cards.map((c) => [c.id, c]));
  const counts = new Map<string, StaleStep>();
  for (const id of new Set(staleIds.map(withPrefix))) {
    const ws = byId.get(id)?.workstream_id;
    const at = ws ? stepOf.get(ws) : undefined;
    if (!at || !ws) continue;
    const prev = counts.get(ws);
    counts.set(ws, prev ? { ...prev, count: prev.count + 1 } : { ...at, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

/** The hand-set session labels on the stale cards, for the banner's "Sessions:" line. */
export function staleSessions(staleIds: readonly string[], cards: readonly ProjectCard[] | null): string[] {
  if (!cards) return [];
  const ids = new Set(staleIds.map(withPrefix));
  const labels = cards.flatMap((c) => (ids.has(c.id) && c.session_link ? [sessionLabel(c.session_link.session)] : []));
  return [...new Set(labels)];
}

/** The newest last-heard time of the stale cards' own sessions, or null when none is known. Never
 * the newest of any session: that one may be reporting right now on another card. */
export function staleSince(staleIds: readonly string[], cards: readonly ProjectCard[] | null): string | null {
  if (!cards) return null;
  const ids = new Set(staleIds.map(withPrefix));
  let newest: string | null = null;
  for (const c of cards) {
    const at = ids.has(c.id) ? c.session_link?.last_heard_at : null;
    if (at && (!newest || Date.parse(at) > Date.parse(newest))) newest = at;
  }
  return newest;
}

/** "a, b, c and 7 more". */
export function listSome(names: readonly string[], keep = 3): string {
  if (names.length <= keep) return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "");
  return `${names.slice(0, keep).join(", ")} and ${names.length - keep} more`;
}
