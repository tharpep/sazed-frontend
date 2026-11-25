import { ApiError } from "@/api/client";
import { errorText } from "@/api/homelab";
import type { Note, NoteFolder } from "@/api/notes";
import { groupByDay, timeLabel } from "./format";

export function canFix(folder: NoteFolder): boolean {
  return folder !== "claude";
}

export function isDirty(original: string, draft: string): boolean {
  return original.trim() !== draft.trim();
}

export function canSave(original: string, draft: string): boolean {
  return isDirty(original, draft) && draft.trim() !== "";
}

export function saveError(err: unknown): string {
  if (err instanceof ApiError && err.status === 409) {
    return "This note changed since you opened it. Close it and open it again.";
  }
  return errorText(err);
}

export function noteFacts(note: Note, now: Date): string {
  const [group] = groupByDay([note], now);
  const author = canFix(note.folder) ? "Written by you" : "Written by an agent";
  return `${group.label} ${timeLabel(note.time)} · ${author}`;
}
