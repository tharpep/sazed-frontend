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
