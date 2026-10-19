import { apiFetch } from "./client";
import type { JobStatus } from "./jobs";

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
}

export async function listBacklog(view: BacklogView, type?: BacklogType): Promise<BacklogItem[]> {
  const q = new URLSearchParams({ view });
  if (type) q.set("type", type);
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
}): Promise<BacklogItem> {
  return apiFetch("/backlog", { method: "POST", body: JSON.stringify(input) }) as Promise<BacklogItem>;
}

export async function updateBacklogItem(
  id: string,
  patch: { status?: "new" | "shortlisted" | "done" | "dismissed"; type?: BacklogType; note?: string }
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

/** Set an open item's priority: 1 = top (others shift down), null takes it off the list. */
export async function moveBacklogItem(id: string, position: number | null): Promise<BacklogItem> {
  return apiFetch(`/backlog/${encodeURIComponent(id)}/move`, {
    method: "POST",
    body: JSON.stringify({ position }),
  }) as Promise<BacklogItem>;
}
