import { apiFetch } from "./client";

// --- Types (mirror sazed app/jobs + routers/jobs.py) ---

export type JobStatus =
  | "queued"
  | "needs_approval"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timed_out";

export type JobKind = "research" | "second_opinion" | "code_task";

export interface JobSummary {
  id: string;
  kind: JobKind;
  agent: "agy" | "claude";
  model: string;
  profile: string;
  title: string;
  status: JobStatus;
  requested_by: string;
  parent_id: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  result_preview: string | null;
  error: string | null;
}

export interface JobEvent {
  at: string;
  event: Record<string, unknown>;
}

export interface JobDetail extends Omit<JobSummary, "result_preview"> {
  prompt: string;
  params: Record<string, unknown>;
  result: string | null;
  meta: {
    tool_calls?: number;
    tools_used?: string[];
    duration_seconds?: number;
    usage?: Record<string, number>;
  };
  events?: JobEvent[];
}

export async function listJobs(): Promise<JobSummary[]> {
  const data = (await apiFetch("/jobs?limit=50")) as { jobs: JobSummary[] };
  return data.jobs;
}

export async function getJob(id: string): Promise<JobDetail> {
  return apiFetch(`/jobs/${encodeURIComponent(id)}`) as Promise<JobDetail>;
}

export async function startResearch(
  question: string,
  depth: "quick" | "deep",
  saveToKb: boolean
): Promise<JobDetail> {
  return apiFetch("/jobs/research", {
    method: "POST",
    body: JSON.stringify({ question, depth, save_to_kb: saveToKb }),
  }) as Promise<JobDetail>;
}

export async function startSecondOpinion(subject: string): Promise<JobDetail> {
  return apiFetch("/jobs/second-opinion", {
    method: "POST",
    body: JSON.stringify({ subject }),
  }) as Promise<JobDetail>;
}

export async function cancelJob(id: string): Promise<JobDetail> {
  return apiFetch(`/jobs/${encodeURIComponent(id)}/cancel`, { method: "POST" }) as Promise<JobDetail>;
}

export const ACTIVE_STATUSES: JobStatus[] = ["queued", "running", "needs_approval"];

export async function startCodeTask(repo: string, instruction: string): Promise<JobDetail> {
  return apiFetch("/jobs/code-task", {
    method: "POST",
    body: JSON.stringify({ repo, instruction, mode: "review" }),
  }) as Promise<JobDetail>;
}

export async function approveJob(id: string): Promise<JobDetail> {
  return apiFetch(`/jobs/${encodeURIComponent(id)}/approve`, { method: "POST" }) as Promise<JobDetail>;
}

export async function continueJob(id: string, instruction: string): Promise<JobDetail> {
  return apiFetch(`/jobs/${encodeURIComponent(id)}/continue`, {
    method: "POST",
    body: JSON.stringify({ instruction }),
  }) as Promise<JobDetail>;
}
