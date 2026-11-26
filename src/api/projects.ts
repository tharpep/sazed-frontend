import { apiFetch } from "./client";
import type { DispatchPlanSummary } from "./dispatch";

export type CardStage = "inbox" | "next" | "doing" | "needs_me" | "done";
export type WorkstreamStatus = "done" | "dropped" | "needs_me" | "in_flight" | "blocked" | "next" | "planned";

export interface BoardProgress {
  done: number;
  in_flight: number;
  needs_me: number;
  next: number;
  total: number;
}

export interface BoardBar {
  done: number;
  in_flight: number;
  needs_me: number;
  next: number;
}

/** A Claude Code session linked to a card, by hand or by its hooks. */
export interface SessionLink {
  session: string;
  branch: string | null;
  pr_repo: string | null;
  pr_number: number | null;
  // The reporting session heard from in the last 24 hours, all null when there is none. Optional
  // because a Sazed before slice 3, and older MCP payloads, send none of the four.
  session_id?: string | null;
  last_heard_at?: string | null;
  doing?: string | null;
  /** running, idle, ended or not_heard_from; a plain string so a newer word still renders. */
  session_status?: string | null;
}

/** Sazed's last snapshot of a card's PR, refreshed by its poller. A PR never fetched has only
 * repo, number, url and state; checks, review and fetched_at are null. The three state words are
 * plain strings so a newer Sazed's new word still renders; proof.ts names the known ones. */
export interface PrSnapshot {
  repo: string;
  number: number;
  url: string;
  state: string;
  checks: {
    state: string;
    passed: number;
    total: number;
    runs: { name: string; conclusion: string | null }[];
  } | null;
  review: { verdict: string; source: string | null; url: string } | null;
  additions: number | null;
  deletions: number | null;
  merged_at: string | null;
  fetched_at: string | null;
}

/** Who approved a card's plan and at which version; plan, version and section are null for a card
 * with no plan link. `by` is "pryce" or "agent:<name>". */
export interface PlanApproval {
  at: string;
  by: string;
  plan: string | null;
  version: number | null;
  section: string | null;
  changed_since: boolean;
}

export interface CardStart {
  at: string;
  by: string;
}

export interface ProjectCard {
  id: string;
  kind: "item" | "job";
  source: string;
  title: string;
  stage: CardStage;
  next: string;
  updated_at: string;
  // Optional because the gateway's MCP cards may still relay a shape from before Sazed sent them.
  done_at?: string | null;
  session_link?: SessionLink | null;
  // Optional for the same reason: a Sazed before the PR poller, and older MCP payloads, send none.
  pr?: PrSnapshot | null;
  repo: string | null;
  item_type: string | null;
  effort: string | null;
  impact: string | null;
  rank: number | null;
  workstream_id: string | null;
  actions: unknown[];
  job_id: string | null;
  job_status: string | null;
  ci_state: string | null;
  fix_count: number | null;
  pr_number: number | null;
  pr_url: string | null;
  pr_draft: boolean | null;
  plan_id: string | null;
  plan_section: string | null;
  plan_version: number | null;
  // Optional because a Sazed before slice 4 (migration 041), and older MCP payloads, send neither.
  plan_approval?: PlanApproval | null;
  started?: CardStart | null;
}

export interface Workstream {
  id: string;
  title: string;
  summary: string;
  position: number;
  state: "open" | "done" | "dropped";
  status: WorkstreamStatus;
  depends_on: string[];
  progress: BoardProgress;
  bar: BoardBar;
  cards?: ProjectCard[];
}

export interface ProjectDispatchRun extends Pick<DispatchPlanSummary, "plan" | "updated_at" | "tasks_total" | "states"> {
  // MCP cards get projects through the gateway, which may still read Sazed's pre-035 shape.
  phases?: Record<string, number>;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  summary: string;
  state: "active" | "paused" | "done" | "dropped";
  rank: number | null;
  repos: string[];
  plan: string | null;
  latest_update: string | null;
  latest_update_at: string | null;
  updated_at: string;
  headline: string;
  progress: BoardProgress;
  bar: BoardBar;
  steps_done: number;
  steps_total: number;
  current: { id: string; title: string; status: WorkstreamStatus } | null;
  workstreams: Workstream[];
  dispatch_runs?: ProjectDispatchRun[];
}

// The endpoints are not deployed yet, so a dev build falls back to fixtures when the fetch fails.
export async function listProjects(): Promise<Project[]> {
  try {
    const data = (await apiFetch("/board/projects")) as { projects: Project[] };
    return data.projects;
  } catch (err) {
    if (!import.meta.env.DEV) throw err;
    return (await import("@/mock/projects")).mockProjects();
  }
}

export async function getProject(slug: string): Promise<Project> {
  try {
    return (await apiFetch(`/board/projects/${encodeURIComponent(slug)}`)) as Project;
  } catch (err) {
    const fixture = import.meta.env.DEV ? (await import("@/mock/projects")).mockProject(slug) : null;
    if (!fixture) throw err;
    return fixture;
  }
}

export type ProjectState = Project["state"];
export type WorkstreamState = Workstream["state"];

export function createProject(input: { slug: string; title: string; summary?: string; repos?: string[] }): Promise<Project> {
  return apiFetch("/board/projects", { method: "POST", body: JSON.stringify(input) }) as Promise<Project>;
}

export function updateProject(
  slug: string,
  patch: { title?: string; summary?: string; state?: ProjectState; latest_update?: string; repos?: string[] }
): Promise<Project> {
  return apiFetch(`/board/projects/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }) as Promise<Project>;
}

export function addWorkstream(slug: string, input: { title: string; summary?: string }): Promise<Workstream> {
  return apiFetch(`/board/projects/${encodeURIComponent(slug)}/workstreams`, {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<Workstream>;
}

export function updateWorkstream(
  id: string,
  patch: { title?: string; summary?: string; state?: WorkstreamState; position?: number }
): Promise<Workstream> {
  return apiFetch(`/board/workstreams/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }) as Promise<Workstream>;
}
