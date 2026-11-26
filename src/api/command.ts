import { apiFetch } from "./client";
import type { PrSnapshot, ProjectCard } from "./projects";
import { mockingSessions, readSessionFields, type Session, type SessionHealth } from "./sessions";

export interface CardAction {
  id: "approve" | "decline" | "answer" | "steer" | "stop" | "resume" | "merge";
  label: string;
  takes_text: boolean;
}

export interface NeedsCard extends Omit<ProjectCard, "actions" | "kind"> {
  kind: ProjectCard["kind"] | "dispatch";
  actions: CardAction[];
  pr_url: string | null;
  question: string | null;
}

export interface WorkingJob {
  kind: "job" | "dispatch";
  job_id?: string;
  plan?: string;
  task?: string;
  line?: string;
  title: string;
  status: "running" | "queued";
  agent: "agy" | "claude";
  model: string;
  profile: string;
  repo: string | null;
  steps: string[];
  tools: number;
  elapsed_s: number;
  timeout_s: number | null;
  actions: CardAction[];
  // Running dispatch items only, and absent from a Sazed that predates it.
  heartbeat_at?: string | null;
}

export interface DoneJob {
  job_id: string;
  title: string;
  status: "succeeded" | "failed" | "timed_out";
  repo: string | null;
  finished_at: string;
}

export interface CommandSummary {
  needs: NeedsCard[];
  working: WorkingJob[];
  done: { succeeded: number; failed: number; latest: DoneJob[]; window_hours: number };
  // Both absent from a Sazed before slice 3 (sazed#212).
  sessions?: Session[];
  session_health?: SessionHealth;
}

// The card views below take stage and kind as plain strings and every PR detail as optional, so a
// new server word or a missing key draws as text instead of failing the whole card.

/** The PR fields the Needs you card reads from a needs item. */
export interface NeedsYouPr extends Pick<PrSnapshot, "repo" | "number" | "url" | "state"> {
  checks?: Pick<NonNullable<PrSnapshot["checks"]>, "state" | "passed" | "total"> | null;
  review?: Pick<NonNullable<PrSnapshot["review"]>, "verdict"> | null;
  additions?: number | null;
  deletions?: number | null;
}

/** One needs item as the board_command card carries it. A dispatch item has no stage or job. */
export interface NeedsYouItem extends Pick<NeedsCard, "id" | "title" | "repo" | "next" | "question"> {
  kind: string;
  stage?: string | null;
  task?: string | null;
  job_id?: string | null;
  job_status?: string | null;
  updated_at?: string | null;
  pr?: NeedsYouPr | null;
}

/** The board_command tool's trimmed view of /board/command: what the Needs you card draws. */
export interface NeedsYouView {
  needs: NeedsYouItem[];
  needs_total?: number | null;
  working: { kind: string; title: string; elapsed_s: number }[];
  done: { succeeded: number; failed: number; window_hours?: number | null };
  session_count?: number | null;
  open_url?: string | null;
}

/** Sazed's PR snapshot as the Pull request card reads it. */
export interface CardPr extends Pick<PrSnapshot, "repo" | "number" | "url" | "state"> {
  merged_at?: string | null;
  fetched_at?: string | null;
  checks?: PrSnapshot["checks"];
  review?: PrSnapshot["review"];
  additions?: number | null;
  deletions?: number | null;
}

/** The board_card tool's card, as the Pull request card reads it; pr is absent on most cards. */
export interface PullRequestView extends Pick<ProjectCard, "id" | "title" | "next" | "repo" | "job_id" | "job_status"> {
  stage: string;
  pr?: CardPr | null;
  open_url?: string | null;
}

export async function getCommand(): Promise<CommandSummary> {
  const raw = (await apiFetch("/board/command")) as CommandSummary;
  const command = { ...raw, ...readSessionFields(raw) };
  if (import.meta.env.DEV && mockingSessions()) return { ...command, ...(await import("@/mock/sessions")).mockSessionFields() };
  return command;
}

export const jobCardId = (jobId: string) => `job:${jobId}`;

export function runAction(cardId: string, action: CardAction["id"], text = ""): Promise<unknown> {
  return apiFetch(`/board/${encodeURIComponent(cardId)}/actions/${action}`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
