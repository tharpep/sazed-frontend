import { apiFetch } from "./client";

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

export interface ProjectCard {
  id: string;
  kind: "item" | "job";
  source: string;
  title: string;
  stage: CardStage;
  next: string;
  updated_at: string;
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
