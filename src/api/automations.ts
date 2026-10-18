import { apiFetch } from "./client";

// --- Types (mirror sazed app/automations/models.py) ---

export interface CronTrigger {
  type: "cron";
  cron: string;
  timezone: string;
}

export type AutomationAction =
  | { type: "sazed_prompt"; prompt: string }
  | { type: "gateway_call"; method: "GET" | "POST"; path: string; body?: Record<string, unknown> | null }
  | {
      type: "job";
      kind: "research" | "second_opinion" | "code_task";
      input: string;
      depth?: "quick" | "deep";
      save_to_kb?: boolean;
      repo?: string | null;
      mode?: "review" | "change";
    };

export interface AutomationOutputs {
  pushover: { title?: string | null; priority?: number } | null;
  journal: { category?: "career" | "personal"; subcategory?: string } | null;
  skip_if_nothing: boolean;
}

export type RunStatus = "running" | "success" | "skipped" | "needs_approval" | "error" | "missed";

export interface Automation {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: CronTrigger;
  action: AutomationAction;
  outputs: AutomationOutputs;
  created_by: "console" | "sazed" | "claude";
  next_run_at: string | null;
  last_run_at: string | null;
  upcoming: string[];
  last_status?: RunStatus | null; // list endpoint only
}

export interface AutomationRun {
  id: string;
  triggered_by: "schedule" | "manual";
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  output: string | null;
  error: string | null;
  session_id: string | null;
  delivered: string[];
}

export interface AutomationDetail extends Automation {
  runs: AutomationRun[];
}

export interface AutomationInput {
  name: string;
  enabled: boolean;
  trigger: CronTrigger;
  action: AutomationAction;
  outputs: AutomationOutputs;
}

// --- Calls (Sazed REST, via the console's /api route) ---

export function listAutomations(): Promise<Automation[]> {
  return apiFetch("/automations") as Promise<Automation[]>;
}

export function getAutomation(id: string): Promise<AutomationDetail> {
  return apiFetch(`/automations/${id}`) as Promise<AutomationDetail>;
}

export function createAutomation(body: AutomationInput): Promise<Automation> {
  return apiFetch("/automations", {
    method: "POST",
    body: JSON.stringify({ ...body, created_by: "console" }),
  }) as Promise<Automation>;
}

export function updateAutomation(id: string, body: Partial<AutomationInput>): Promise<Automation> {
  return apiFetch(`/automations/${id}`, { method: "PATCH", body: JSON.stringify(body) }) as Promise<Automation>;
}

export function deleteAutomation(id: string): Promise<unknown> {
  return apiFetch(`/automations/${id}`, { method: "DELETE" });
}

export function runAutomation(id: string): Promise<{ run_id: string }> {
  return apiFetch(`/automations/${id}/run`, { method: "POST" }) as Promise<{ run_id: string }>;
}

export function previewSchedule(cron: string, timezone: string): Promise<{ upcoming: string[] }> {
  return apiFetch("/automations/preview-schedule", {
    method: "POST",
    body: JSON.stringify({ cron, timezone }),
  }) as Promise<{ upcoming: string[] }>;
}
