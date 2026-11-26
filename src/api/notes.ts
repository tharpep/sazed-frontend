import { apiFetch, gatewayFetch } from "./client";

export type NoteFolder = "inbox" | "notes" | "claude";

export interface Filed {
  by: string;
  at: string | null;
  reason: string | null;
  kind: string | null;
  filer: string | null;
}

export interface Note {
  path: string;
  folder: NoteFolder;
  title: string;
  time: string;
  source: string | null;
  excerpt: string;
  match: string | null;
  topic: string | null;
  filed: Filed | null;
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
  topic?: string;
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
  if (query.topic) params.set("topic", query.topic);
  const qs = params.toString();
  return gatewayFetch(`/vault/notes${qs ? `?${qs}` : ""}`) as Promise<NotesResult>;
}

export async function captureNote(content: string): Promise<CaptureResult> {
  return gatewayFetch("/vault/capture", {
    method: "POST",
    body: JSON.stringify({ content, source: "console" }),
  }) as Promise<CaptureResult>;
}

export interface FullNote {
  path: string;
  folder: NoteFolder;
  title: string;
  time: string;
  source: string | null;
  text: string;
  version: string;
  topic: string | null;
  filed: Filed | null;
}

export interface SavedNote {
  path: string;
  version: string;
}

export async function readNote(path: string): Promise<FullNote> {
  return gatewayFetch(`/vault/note?path=${encodeURIComponent(path)}`) as Promise<FullNote>;
}

export async function saveNote(path: string, content: string, version: string): Promise<SavedNote> {
  return gatewayFetch("/vault/note", {
    method: "PUT",
    body: JSON.stringify({ path, content, version }),
  }) as Promise<SavedNote>;
}

export async function deleteNote(path: string): Promise<void> {
  await gatewayFetch(`/vault/note?path=${encodeURIComponent(path)}`, { method: "DELETE" });
}

export interface Topic {
  name: string;
  count: number;
}

export interface TopicsResult {
  topics: Topic[];
  unfiled: number;
}

export interface MovedNote {
  path: string;
  topic: string;
  from: string;
}

export interface FiledNote extends MovedNote {
  new_topic: boolean;
  reason: string;
  by_tag: boolean;
}

export async function listTopics(): Promise<TopicsResult> {
  return gatewayFetch("/vault/topics") as Promise<TopicsResult>;
}

export async function moveNote(path: string, topic: string): Promise<MovedNote> {
  return gatewayFetch("/vault/move", {
    method: "POST",
    body: JSON.stringify({ path, topic }),
  }) as Promise<MovedNote>;
}

export async function fileNote(path: string): Promise<FiledNote> {
  return apiFetch("/notes/file", {
    method: "POST",
    body: JSON.stringify({ path }),
  }) as Promise<FiledNote>;
}
