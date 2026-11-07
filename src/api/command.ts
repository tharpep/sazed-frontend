import { apiFetch } from "./client";
import type { ProjectCard } from "./projects";

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
}

export function getCommand(): Promise<CommandSummary> {
  return apiFetch("/board/command") as Promise<CommandSummary>;
}

export const jobCardId = (jobId: string) => `job:${jobId}`;

export function runAction(cardId: string, action: CardAction["id"], text = ""): Promise<unknown> {
  return apiFetch(`/board/${encodeURIComponent(cardId)}/actions/${action}`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
