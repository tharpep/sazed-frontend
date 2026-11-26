import { apiFetch } from "./client";
import type { JobStatus } from "./jobs";
import type { ProjectCard } from "./projects";

// --- Types (mirror sazed app/backlog + routers/backlog.py) ---

export type BacklogType = "idea" | "bug" | "gap" | "optimization" | "planned" | "known_issue";
export type BacklogStatus = "new" | "shortlisted" | "approved" | "done" | "dismissed" | "stale";
export type BacklogView = "open" | "done" | "dismissed" | "all";

export interface BacklogItem {
  id: string;
  type: BacklogType;
  status: BacklogStatus;
  title: string;
  summary: string;
  why: string;
  repos: string[];
  effort: "S" | "M" | "L" | null;
  impact: "low" | "medium" | "high" | null;
  sources: string[];
  source: string;
  note: string | null;
  job_id: string | null;
  job_status: JobStatus | null;
  job_meta: { pr_url?: string; pr_number?: number; ci_state?: string } | null;
  rank: number | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
  workstream_id?: string | null;
  // Set when a Claude Code session linked itself to the item by hand.
  session_label?: string | null;
  session_branch?: string | null;
  pr_repo?: string | null;
  pr_number?: number | null;
}

export async function listBacklog(view: BacklogView, type?: BacklogType, limit?: number): Promise<BacklogItem[]> {
  const q = new URLSearchParams({ view });
  if (type) q.set("type", type);
  if (limit) q.set("limit", String(limit));
  const data = (await apiFetch(`/backlog?${q}`)) as { items: BacklogItem[] };
  return data.items;
}

export async function getBacklogItem(id: string): Promise<BacklogItem> {
  return apiFetch(`/backlog/${encodeURIComponent(id)}`) as Promise<BacklogItem>;
}

export async function createBacklogItem(input: {
  type: BacklogType;
  title: string;
  summary?: string;
  why?: string;
  repos?: string[];
  workstream_id?: string;
}): Promise<BacklogItem> {
  return apiFetch("/backlog", { method: "POST", body: JSON.stringify(input) }) as Promise<BacklogItem>;
}

export async function updateBacklogItem(
  id: string,
  patch: {
    status?: "new" | "shortlisted" | "done" | "dismissed";
    type?: BacklogType;
    note?: string;
    workstream_id?: string | null;
  }
): Promise<BacklogItem> {
  return apiFetch(`/backlog/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }) as Promise<BacklogItem>;
}

export async function approveBacklogItem(id: string, repo: string, note: string): Promise<BacklogItem> {
  return apiFetch(`/backlog/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: JSON.stringify({ repo, note }),
  }) as Promise<BacklogItem>;
}

/** What every plan-state route answers: the card as `GET /board/item:{id}` returns it. */
export interface PlanStateResult {
  changed: boolean;
  card: ProjectCard | null;
}

// The console is always the owner (slice-4-contract.md, "The actor").
const OWNER = "pryce";

function planState(id: string, route: "approve-plan" | "start" | "withdraw", extra: object = {}): Promise<PlanStateResult> {
  return apiFetch(`/backlog/${encodeURIComponent(id)}/${route}`, {
    method: "POST",
    body: JSON.stringify({ by: OWNER, ...extra }),
  }) as Promise<PlanStateResult>;
}

/** Records the plan approved. It starts nothing. */
export const approvePlan = (id: string) => planState(id, "approve-plan");
/** Hands the card to an orchestrator; a 409 says why it cannot start yet. */
export const startCard = (id: string) => planState(id, "start");
export const withdrawStep = (id: string, step: "start" | "approval") => planState(id, "withdraw", { step });

/** One card from the board, by its bare item id. */
export async function getItemCard(id: string): Promise<ProjectCard> {
  return apiFetch(`/board/${encodeURIComponent(`item:${id}`)}`) as Promise<ProjectCard>;
}

/** Set an open item's priority: 1 = top (others shift down), null takes it off the list. */
export async function moveBacklogItem(id: string, position: number | null): Promise<BacklogItem> {
  return apiFetch(`/backlog/${encodeURIComponent(id)}/move`, {
    method: "POST",
    body: JSON.stringify({ position }),
  }) as Promise<BacklogItem>;
}
