import type { Note, Topic } from "@/api/notes";

const NAME = /^[A-Za-z0-9][A-Za-z0-9 &'-]{0,39}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function topicProblem(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === "") return "Give the topic a name.";
  if (!NAME.test(trimmed)) return "Use up to 40 letters, digits, spaces, & ' or -.";
  return null;
}

export function becauseText(reason: string | null): string {
  const trimmed = reason?.trim() ?? "";
  if (trimmed === "") return "";
  const lowered = trimmed.replace(/^Because/, "because");
  return /[.!?]$/.test(lowered) ? lowered : `${lowered}.`;
}

export function isFresh(note: Pick<Note, "time">, now: Date): boolean {
  const age = now.getTime() - new Date(note.time).getTime();
  return age >= 0 && age < DAY_MS;
}

export function filedText(
  note: Pick<Note, "topic" | "filed">
): { lead: string; topic: string; tail: string } | null {
  if (!note.topic) return null;
  const { topic, filed } = note;
  if (!filed) return { lead: "Under ", topic, tail: "." };
  if (filed.by === "you") return { lead: "You moved this to ", topic, tail: "." };
  const because = becauseText(filed.reason);
  return { lead: "Filed under ", topic, tail: because ? ` ${because}` : "." };
}

export function quickTopics(topics: Topic[], current: string | null, max = 2): Topic[] {
  const skip = current?.toLowerCase();
  return topics.filter((t) => t.name.toLowerCase() !== skip).slice(0, max);
}
