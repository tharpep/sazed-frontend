import { apiFetch } from "./client";

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
