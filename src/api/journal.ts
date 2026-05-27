import { apiFetch } from "./client";

export type JournalCategory = "career" | "personal";

export interface JournalEntry {
  id: string;
  entry_date: string;
  category: JournalCategory;
  subcategory: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface JournalEntryCreate {
  category: JournalCategory;
  subcategory: string;
  title: string;
  body: string;
  entry_date?: string;
  tags?: string[];
}

export interface JournalEntryUpdate {
  category?: JournalCategory;
  subcategory?: string;
  title?: string;
  body?: string;
  entry_date?: string;
  tags?: string[];
}

export interface ListParams {
  category?: JournalCategory;
  subcategory?: string;
  tag?: string;
  q?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  cursor?: string;
}

export interface EntryPage {
  entries: JournalEntry[];
  next_cursor: string | null;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function listEntries(params?: ListParams): Promise<EntryPage> {
  return apiFetch(`/journal/entries${qs({ ...params })}`) as Promise<EntryPage>;
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

export async function listSubcategories(category?: JournalCategory): Promise<string[]> {
  return apiFetch(`/journal/subcategories${qs({ category })}`) as Promise<string[]>;
}
