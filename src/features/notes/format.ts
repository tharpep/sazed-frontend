import type { Note } from "@/api/notes";

export interface DayGroup {
  key: string;
  label: string;
  sub: string;
  notes: Note[];
}

export interface MatchPiece {
  text: string;
  hit: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const CHARS_PER_LINE = 32;
const CHROME_LINES = 2;
const MAX_LINES = 14;
const CARD_CHARS = 280;

const pad = (n: number) => String(n).padStart(2, "0");

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayMonth(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function groupByDay(notes: Note[], now: Date): DayGroup[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  const sorted = [...notes].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
  const groups = new Map<string, DayGroup>();
  for (const note of sorted) {
    const d = new Date(note.time);
    const key = dayKey(d);
    let group = groups.get(key);
    if (!group) {
      const isToday = key === dayKey(today);
      const isYesterday = key === dayKey(yesterday);
      group = {
        key,
        label: isToday
          ? "Today"
          : isYesterday
            ? "Yesterday"
            : `${DAYS[d.getDay()]} ${dayMonth(d)}`,
        sub: isToday || isYesterday ? dayMonth(d) : "",
        notes: [],
      };
      groups.set(key, group);
    }
    group.notes.push(note);
  }
  return [...groups.values()].sort((a, b) =>
    a.key < b.key ? 1 : a.key > b.key ? -1 : 0,
  );
}

export function splitColumns<T>(
  items: T[],
  columns: number,
  weight: (item: T) => number,
): T[][] {
  const cols: T[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);
  for (const item of items) {
    let lightest = 0;
    for (let i = 1; i < columns; i++)
      if (heights[i] < heights[lightest]) lightest = i;
    cols[lightest].push(item);
    heights[lightest] += weight(item);
  }
  return cols;
}

export function noteWeight(note: Note): number {
  return Math.min(
    MAX_LINES,
    Math.ceil(note.excerpt.length / CHARS_PER_LINE) + CHROME_LINES,
  );
}

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function cardText(note: Note): string {
  return note.excerpt.length > CARD_CHARS
    ? `${note.excerpt.slice(0, CARD_CHARS)}…`
    : note.excerpt;
}

export function splitMatch(text: string, q: string): MatchPiece[] {
  if (!text) return [];
  if (!q) return [{ text, hit: false }];
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text
    .split(re)
    .map((piece, i) => ({ text: piece, hit: i % 2 === 1 }))
    .filter((piece) => piece.text !== "");
}
