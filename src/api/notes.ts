import { gatewayFetch } from "./client";

export type NoteFolder = "inbox" | "notes" | "claude";

export interface Note {
  path: string;
  folder: NoteFolder;
  title: string;
  time: string;
  source: string | null;
  excerpt: string;
  match: string | null;
}

export interface NotesResult {
  notes: Note[];
  total: number;
}

export interface NotesQuery {
  folders?: NoteFolder[];
  q?: string;
  limit?: number;
  offset?: number;
}

export interface CaptureResult {
  path: string;
  captured: string;
}

export async function listNotes(query: NotesQuery = {}): Promise<NotesResult> {
  const params = new URLSearchParams();
  for (const folder of query.folders ?? []) params.append("folder", folder);
  if (query.q) params.set("q", query.q);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  const qs = params.toString();
  return gatewayFetch(`/vault/notes${qs ? `?${qs}` : ""}`) as Promise<NotesResult>;
}

export async function captureNote(content: string): Promise<CaptureResult> {
  return gatewayFetch("/vault/capture", {
    method: "POST",
    body: JSON.stringify({ content, source: "console" }),
  }) as Promise<CaptureResult>;
}
