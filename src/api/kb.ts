import { apiFetch } from "./client";

export interface KbStats {
  chunk_count: number;
  file_count: number;
}

export interface KbSource {
  file_id: string;
  filename: string;
  category: string;
  modified_time: string | null;
  last_synced: string | null;
  chunk_count: number;
  status: "active" | "deleted" | string;
}

export interface KbSyncResult {
  files_synced: number;
  files_skipped: number;
  files_deleted: number;
  chunks_inserted: number;
  errors: string[];
  synced_at: string;
}

export async function getKbStats(): Promise<KbStats> {
  return apiFetch("/kb/stats") as Promise<KbStats>;
}

export async function getKbSources(): Promise<{ sources: KbSource[] }> {
  const data = await apiFetch("/kb/sources");
  // Handle both { sources: [] } and [] directly from gateway
  return Array.isArray(data) ? { sources: data as KbSource[] } : (data as { sources: KbSource[] });
}

export async function syncKb(force = false): Promise<KbSyncResult> {
  return apiFetch(`/kb/sync?force=${force}`, { method: "POST" }) as Promise<KbSyncResult>;
}

export async function deleteKbFile(driveFileId: string): Promise<unknown> {
  return apiFetch(`/kb/files/${encodeURIComponent(driveFileId)}`, { method: "DELETE" });
}

export async function clearKb(): Promise<unknown> {
  return apiFetch("/kb", { method: "DELETE" });
}
