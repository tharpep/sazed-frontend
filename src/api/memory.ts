import { apiFetch } from "./client";

export interface Fact {
  id: string;
  fact_type: string;
  key: string;
  value: string;
  confidence: number;
  source?: string;
  updated_at?: string;
}

export interface ListMemoryResponse {
  facts: Fact[];
  count: number;
}

export interface UpsertMemoryBody {
  fact_type: string;
  key: string;
  value: string;
  confidence?: number;
}

export interface DeleteMemoryResponse {
  deleted: string;
}

export async function listMemory(): Promise<ListMemoryResponse> {
  const data = await apiFetch("/memory");
  return data as ListMemoryResponse;
}

export async function upsertMemory(body: UpsertMemoryBody): Promise<Fact> {
  const data = await apiFetch("/memory", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return data as Fact;
}

export async function deleteMemory(id: string): Promise<DeleteMemoryResponse> {
  const data = await apiFetch(`/memory/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return data as DeleteMemoryResponse;
}
