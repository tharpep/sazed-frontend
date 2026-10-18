import { apiFetch } from "./client";
import { useSettingsStore } from "../store/settingsStore";

// --- Types (mirror sazed app/activity + routers/activity.py) ---

export type ActivityStatus = "ok" | "error" | "running" | "pending" | "info";

export type ActivityCategory =
  | "chat"
  | "llm"
  | "tool"
  | "approval"
  | "automation"
  | "job"
  | "backlog"
  | "homelab"
  | "notify"
  | "mcp";

export interface ActivityEvent {
  id: number;
  at: string;
  kind: string;
  title: string;
  status: ActivityStatus;
  trace: string | null;
  refs: Record<string, string | null | undefined>;
  duration_ms: number | null;
  cost_usd?: number | null;
  tokens?: number;
  detail?: Record<string, unknown>;
}

export interface JobStep {
  at: string;
  event: Record<string, unknown>;
}

export interface ActivityFlow {
  trace: string;
  traces: string[];
  events: ActivityEvent[];
  steps: Record<string, JobStep[]>;
}

export interface ActivitySummary {
  last_24h: {
    chat_messages: number;
    llm_calls: number;
    tool_calls: number;
    jobs: number;
    notifications: number;
    errors: number;
    cost_usd: number;
    tokens: number;
  };
  now: {
    jobs_running: number;
    jobs_queued: number;
    jobs_waiting: number;
    runs_running: number;
    approvals_pending: number;
  };
}

export async function listActivity(
  categories: ActivityCategory[],
  errorsOnly: boolean,
  beforeId?: number
): Promise<ActivityEvent[]> {
  const q = new URLSearchParams({ limit: "100" });
  if (categories.length) q.set("categories", categories.join(","));
  if (errorsOnly) q.set("errors", "true");
  if (beforeId) q.set("before_id", String(beforeId));
  const data = (await apiFetch(`/activity?${q}`)) as { events: ActivityEvent[] };
  return data.events;
}

export async function getActivitySummary(): Promise<ActivitySummary> {
  return apiFetch("/activity/summary") as Promise<ActivitySummary>;
}

export async function getActivityEvent(id: number): Promise<ActivityEvent> {
  return apiFetch(`/activity/events/${id}`) as Promise<ActivityEvent>;
}

export async function getFlow(trace: string): Promise<ActivityFlow> {
  return apiFetch(`/activity/flow?trace=${encodeURIComponent(trace)}`) as Promise<ActivityFlow>;
}

export interface StepEvent {
  job: string;
  at: string;
  event: Record<string, unknown>;
}

export interface StreamHandlers {
  onReady: () => void;
  onEvent: (e: ActivityEvent) => void;
  onStep: (s: StepEvent) => void;
}

/** Follow /activity/stream until `signal` aborts or the connection drops (resolves either way;
 * the caller reconnects with the last id it saw). fetch rather than EventSource so the API key
 * header works the same as everywhere else. */
export async function streamActivity(
  afterId: number | undefined,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<void> {
  const settings = useSettingsStore.getState();
  const base = (settings.getEffectiveBase() || "http://localhost:8000").replace(/\/$/, "");
  const key = settings.getEffectiveKey();
  const q = afterId ? `?after_id=${afterId}` : "";
  const res = await fetch(`${base}/activity/stream${q}`, {
    headers: key ? { "X-API-Key": key } : {},
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      let type = "";
      let data = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) type = line.slice(7).trim();
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (!type) continue;
      try {
        const parsed = data ? JSON.parse(data) : {};
        if (type === "ready") handlers.onReady();
        else if (type === "activity") handlers.onEvent(parsed as ActivityEvent);
        else if (type === "step") handlers.onStep(parsed as StepEvent);
      } catch {
        // a malformed message is skipped, not fatal
      }
    }
  }
}
