import { apiFetch } from "./client";

export interface JournalEntry {
  id: string;
  entry_date: string;
  project: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface JournalEntryCreate {
  project: string;
  title: string;
  body: string;
  entry_date?: string;
  tags?: string[];
}

export interface JournalEntryUpdate {
  project?: string;
  title?: string;
  body?: string;
  entry_date?: string;
  tags?: string[];
}

export interface ListParams {
  project?: string;
  tag?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export async function listEntries(params?: ListParams): Promise<JournalEntry[]> {
  const qs = new URLSearchParams();
  if (params?.project) qs.set("project", params.project);
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.start_date) qs.set("start_date", params.start_date);
  if (params?.end_date) qs.set("end_date", params.end_date);
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch(`/journal/entries${query ? `?${query}` : ""}`) as Promise<JournalEntry[]>;
}

export async function getEntry(id: string): Promise<JournalEntry> {
  return apiFetch(`/journal/entries/${id}`) as Promise<JournalEntry>;
}

export async function createEntry(body: JournalEntryCreate): Promise<JournalEntry> {
  return apiFetch("/journal/entries", {
    method: "POST",
    body: JSON.stringify(body),
  }) as Promise<JournalEntry>;
}

export async function updateEntry(id: string, body: JournalEntryUpdate): Promise<JournalEntry> {
  return apiFetch(`/journal/entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as Promise<JournalEntry>;
}

export async function deleteEntry(id: string): Promise<void> {
  await apiFetch(`/journal/entries/${id}`, { method: "DELETE" });
}

export async function listProjects(): Promise<string[]> {
  return apiFetch("/journal/projects") as Promise<string[]>;
}
