import { gatewayFetch } from "./client";

// --- Types (mirror knowledge-base /v1/kb responses, reached through the gateway's /kb proxy) ---

export type KbOrigin = "upload" | "text" | "url" | "drive";

export interface KbStats {
  chunk_count: number;
  file_count: number;
}

export interface KbSource {
  file_id: string;
  filename: string;
  category: string;
  origin: KbOrigin | string;
  summary: string | null;
  modified_time: string | null;
  last_synced: string | null;
  chunk_count: number;
  content_chars: number;
  status: "active" | "deleted" | "error" | string;
}

export interface KbSourceContent {
  file_id: string;
  filename: string;
  category: string;
  origin: string;
  content: string;
}

export interface KbIngestResult {
  file_id: string;
  filename: string;
  category: string | null;
  origin: string;
  chunk_count: number;
  summary: string;
}

export interface KbSearchHit {
  content: string;
  filename: string;
  drive_file_id: string; // the source's file_id (old column name)
  chunk_index: number;
  source_category: string;
  rerank_score: number;
}

// Must match knowledge-base app/routes/ingest.py.
export const UPLOAD_ACCEPT = ".pdf,.docx,.md,.markdown,.txt,.csv";
export const MAX_UPLOAD_MB = 15;

export async function getKbStats(): Promise<KbStats> {
  return gatewayFetch("/kb/stats") as Promise<KbStats>;
}

export async function listKbSources(): Promise<KbSource[]> {
  const data = (await gatewayFetch("/kb/sources")) as { sources: KbSource[] };
  return data.sources;
}

export async function getKbSourceContent(fileId: string): Promise<KbSourceContent> {
  return gatewayFetch(`/kb/sources/${encodeURIComponent(fileId)}/content`) as Promise<KbSourceContent>;
}

export type KbExportFormat = "md" | "txt";

/** A source's full stored text, as the gateway's export route serves it for download. */
export async function exportKbSource(fileId: string, format: KbExportFormat): Promise<string> {
  return gatewayFetch(
    `/kb/sources/${encodeURIComponent(fileId)}/export?format=${format}`
  ) as Promise<string>;
}

export async function deleteKbSource(fileId: string): Promise<void> {
  await gatewayFetch(`/kb/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
}

export async function ingestFile(file: File, category: string): Promise<KbIngestResult> {
  const body = new FormData();
  body.append("file", file);
  if (category) body.append("category", category);
  return gatewayFetch("/kb/ingest/file", { method: "POST", body }) as Promise<KbIngestResult>;
}

export async function ingestText(title: string, content: string, category: string): Promise<KbIngestResult> {
  return gatewayFetch("/kb/ingest/text", {
    method: "POST",
    body: JSON.stringify({ title, content, category: category || null }),
  }) as Promise<KbIngestResult>;
}

export async function ingestUrl(url: string, category: string): Promise<KbIngestResult> {
  return gatewayFetch("/kb/ingest/url", {
    method: "POST",
    body: JSON.stringify({ url, category: category || null }),
  }) as Promise<KbIngestResult>;
}

export async function searchKb(query: string, topK = 5): Promise<KbSearchHit[]> {
  const data = (await gatewayFetch("/kb/search", {
    method: "POST",
    body: JSON.stringify({ query, top_k: topK }),
  })) as { results: KbSearchHit[] };
  return data.results;
}
