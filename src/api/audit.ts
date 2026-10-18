import { apiFetch } from "./client";

export interface ActionLog {
  id: string;
  session_id: string | null;
  timestamp: string;
  tool_name: string;
  input: Record<string, unknown> | null;
  output: string | null;
  status: "success" | "error";
  error_message: string | null;
  duration_ms: number | null;
}

export async function getActionLogs(params?: {
  session_id?: string;
  status?: string;
  limit?: number;
}): Promise<ActionLog[]> {
  const q = new URLSearchParams();
  if (params?.session_id) q.set("session_id", params.session_id);
  if (params?.status) q.set("status", params.status);
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  const data = await apiFetch(`/audit/actions${qs ? `?${qs}` : ""}`);
  return data as ActionLog[];
}

// --- Rollups (GET /audit/metrics) ---

export interface ModelUsage {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface AuditMetrics {
  since: string;
  llm: {
    total_calls: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost_usd: number;
    by_model: Record<string, ModelUsage>;
    by_purpose: Record<string, { calls: number; cost_usd: number }>;
  };
  tools: {
    total_calls: number;
    success_rate: number | null;
    duration_ms_p50: number | null;
    duration_ms_p95: number | null;
    top_by_call_count: { tool_name: string; count: number }[];
    top_by_error_count: { tool_name: string; count: number }[];
  };
}

export async function getMetrics(sinceHours: number): Promise<AuditMetrics> {
  return (await apiFetch(`/audit/metrics?since_hours=${sinceHours}`)) as AuditMetrics;
}
