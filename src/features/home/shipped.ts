import type { ProjectCard } from "@/api/projects";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 14;

export interface ShippedDay {
  key: string;
  label: string;
  cards: ProjectCard[];
}

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayLabel(start: number, today: number): string {
  // Rounded, so a day that is 23 or 25 hours long across a clock change still counts as one.
  const back = Math.round((today - start) / DAY_MS);
  if (back === 0) return "Today";
  if (back === 1) return "Yesterday";
  return new Date(start).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Done cards by local day, newest first, over the board's 14 days. Today is always present, even
 * empty; any other day only when something shipped. */
export function shippedDays(cards: readonly ProjectCard[], now = new Date()): ShippedDay[] {
  const today = dayStart(now);
  const oldest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (WINDOW_DAYS - 1)).getTime();
  const byDay = new Map<number, ProjectCard[]>([[today, []]]);
  const done = cards
    .filter((c) => c.stage === "done" && c.done_at && !Number.isNaN(Date.parse(c.done_at)))
    .sort((a, b) => Date.parse(b.done_at!) - Date.parse(a.done_at!));
  for (const card of done) {
    const start = dayStart(new Date(card.done_at!));
    if (start < oldest || start > today) continue;
    byDay.set(start, [...(byDay.get(start) ?? []), card]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => b - a)
    .map(([start, list]) => ({ key: String(start), label: dayLabel(start, today), cards: list }));
}

/** Keeps the first n rows across days, dropping days left with none (an empty Today stays). */
export function firstRows(days: readonly ShippedDay[], n: number): ShippedDay[] {
  let left = n;
  return days.flatMap((d) => {
    if (d.cards.length === 0) return d.label === "Today" ? [d] : [];
    if (left <= 0) return [];
    const cards = d.cards.slice(0, left);
    left -= cards.length;
    return [{ ...d, cards }];
  });
}

/** "23:30" in local time. */
export function clockOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}
