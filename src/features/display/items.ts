import type { CalendarEvent, EmailMessage } from "@/api/display";
import { gib, statusOf } from "@/features/homelab/format";
import type { DisplayFeed } from "./useDisplayFeed";

export type Tone = "normal" | "attention" | "problem";

export interface Item {
  key: string;
  when: string;
  title: string;
  meta?: string;
  tone: Tone;
}

export interface Chip {
  key: string;
  label: string;
  tone: Tone;
}

const DAY = 86_400_000;

function dayOffset(d: Date, now: Date): number {
  return Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / DAY);
}

/** "7 AM", "8:30 AM" */
export function shortTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(":00", "");
}

/** "8:30 AM" today, "Sat 7 AM" later in the week. */
export function when(iso: string, now: Date, allDay = false): string {
  const d = new Date(iso);
  const offset = dayOffset(d, now);
  if (offset <= 0) return allDay ? "All day" : shortTime(d);
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  return allDay ? day : `${day} ${shortTime(d)}`;
}

export function dayLabel(d: Date, now: Date): string {
  const offset = dayOffset(d, now);
  if (offset <= 0) return "Today";
  if (offset === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

/** Calendar titles like "Work - (Virtual)" read as "Work, virtual". */
export function eventTitle(e: CalendarEvent): string {
  return e.title.replace(/\s*-\s*\(([^)]+)\)\s*$/, (_, x: string) => `, ${x.toLowerCase()}`);
}

function eventEnd(e: CalendarEvent): number {
  return new Date(e.end).getTime();
}

function upcomingEvents(events: CalendarEvent[] | null, now: Date): CalendarEvent[] {
  return (events ?? [])
    .filter((e) => eventEnd(e) > now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** What needs Pryce first (jobs waiting, approvals, services down), then what's coming by time. */
export function nextUp(feed: DisplayFeed, now: Date, limit: number): Item[] {
  const alerts: Item[] = [];
  for (const job of feed.waiting ?? []) {
    alerts.push({
      key: `job-${job.id}`,
      when: job.status === "needs_approval" ? "Approve" : "Question",
      title: job.title,
      tone: "attention",
    });
  }
  if (feed.approvals > 0) {
    alerts.push({
      key: "approvals",
      when: "Approve",
      title: feed.approvals === 1 ? "An automation run to approve" : `${feed.approvals} automation runs to approve`,
      tone: "attention",
    });
  }
  for (const s of feed.services ?? []) {
    if (statusOf(s) === "down") alerts.push({ key: `down-${s.id}`, when: "Down", title: s.name, tone: "problem" });
  }

  const timed: { at: number; item: Item }[] = [];
  for (const e of upcomingEvents(feed.events, now)) {
    const started = !e.all_day && new Date(e.start) <= now;
    timed.push({
      at: new Date(e.start).getTime(),
      item: {
        key: `ev-${e.id}-${e.start}`,
        when: started ? "Now" : when(e.start, now, e.all_day),
        title: eventTitle(e),
        meta: started ? `until ${shortTime(new Date(e.end))}` : undefined,
        tone: "normal",
      },
    });
  }
  const tasks = (feed.tasksDue ?? []).map((t) => ({
    key: `task-${t.id}`,
    when: t.due && dayOffset(new Date(t.due), now) < 0 ? "Overdue" : "Due",
    title: t.title,
    tone: "normal" as const,
  }));
  const nextRun = (feed.automations ?? [])
    .filter((a) => a.enabled && a.next_run_at)
    .sort((a, b) => a.next_run_at!.localeCompare(b.next_run_at!))[0];
  if (nextRun && new Date(nextRun.next_run_at!).getTime() - now.getTime() < 7 * DAY) {
    timed.push({
      at: new Date(nextRun.next_run_at!).getTime(),
      item: { key: `auto-${nextRun.id}`, when: when(nextRun.next_run_at!, now), title: nextRun.name, tone: "normal" },
    });
  }
  timed.sort((a, b) => a.at - b.at);

  return [...alerts, ...tasks, ...timed.map((t) => t.item)].slice(0, limit);
}

export interface DayGroup {
  label: string;
  items: Item[];
}

export function week(feed: DisplayFeed, now: Date): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const e of upcomingEvents(feed.events, now)) {
    const label = dayLabel(new Date(e.start), now);
    let group = groups.find((g) => g.label === label);
    if (!group) groups.push((group = { label, items: [] }));
    group.items.push({
      key: `wk-${e.id}-${e.start}`,
      when: e.all_day ? "All day" : shortTime(new Date(e.start)),
      title: eventTitle(e),
      tone: "normal",
    });
  }
  return groups;
}

/** `"vercel[bot]" <notifications@github.com>` reads as "Vercel"; anyone else via GitHub's
 * notifications address (Pryce's own CI runs) as "GitHub". */
export function senderName(sender: string): string {
  const name = sender.replace(/<[^>]*>/, "").replace(/"/g, "").trim() || sender;
  const bot = name.match(/^([\w-]+)\[bot\]$/);
  if (bot) return bot[1].charAt(0).toUpperCase() + bot[1].slice(1);
  if (/@github\.com>?$/i.test(sender)) return "GitHub";
  return name;
}

/** GitHub subjects drop "Re:" and the owner: "[tharpep/kelsier] Run failed" reads "kelsier: Run failed". */
export function subjectLine(m: EmailMessage): string {
  return m.subject
    .replace(/^(re|fwd?):\s*/i, "")
    .replace(/^\[(?:[^/\]]+\/)?([^\]]+)\]\s*/, "$1: ")
    .trim();
}

export function mailFrom(messages: EmailMessage[]): string | null {
  if (messages.length < 3) return null;
  const counts = new Map<string, number>();
  for (const m of messages) {
    const key = /@github\.com>?$/i.test(m.sender) ? "GitHub" : senderName(m.sender);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [top, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return n / messages.length >= 0.5 ? top : null;
}

export function chips(feed: DisplayFeed, compact: boolean): Chip[] {
  const out: Chip[] = [];
  if (!feed.online) out.push({ key: "offline", label: "Sazed offline", tone: "problem" });
  const waiting = (feed.waiting?.length ?? 0) + feed.approvals;
  if (waiting > 0) out.push({ key: "waiting", label: compact ? `${waiting} waiting` : `${waiting} waiting on you`, tone: "attention" });
  if (feed.mail) out.push({ key: "mail", label: feed.mail.count ? `${feed.mail.count} unread` : "Inbox clear", tone: "normal" });
  if (feed.services) {
    const checked = feed.services.filter((s) => statusOf(s) !== "unknown");
    const down = checked.filter((s) => statusOf(s) === "down").length;
    const up = checked.filter((s) => statusOf(s) === "up").length;
    out.push(
      down
        ? { key: "lab", label: `${down} down`, tone: "problem" }
        : { key: "lab", label: compact ? `${up} up` : `${up} services up`, tone: "normal" }
    );
  }
  return out;
}

/** The night face's one line: the first thing on the calendar after now. */
export function firstThing(feed: DisplayFeed, now: Date): string | null {
  const e = upcomingEvents(feed.events, now).find((x) => !x.all_day && new Date(x.start) > now);
  if (!e) return null;
  const d = new Date(e.start);
  const offset = dayOffset(d, now);
  const day = offset === 0 ? "" : offset === 1 ? " tomorrow" : ` ${d.toLocaleDateString("en-US", { weekday: "long" })}`;
  return `${eventTitle(e).split(",")[0]} at ${shortTime(d)}${day}`;
}

export function mailRows(feed: DisplayFeed): Item[] {
  return (feed.mail?.messages ?? [])
    .slice(0, 5)
    .map((m) => ({ key: m.id, when: senderName(m.sender), title: subjectLine(m), tone: "normal" as const }));
}

export function homelabRows(feed: DisplayFeed): Item[] {
  const services = feed.services ?? [];
  const down = services.filter((s) => statusOf(s) === "down");
  const maintenance = services.filter((s) => statusOf(s) === "maintenance");
  const up = services.filter((s) => statusOf(s) === "up").length;
  const rows: Item[] = [
    ...down.map((s) => ({ key: `d-${s.id}`, when: "Down", title: s.name, tone: "problem" as const })),
    ...maintenance.map((s) => ({ key: `m-${s.id}`, when: "Upkeep", title: s.name, tone: "attention" as const })),
    {
      key: "up",
      when: "Services",
      title: down.length || maintenance.length ? `${up} of ${services.length} up` : `All ${up} up`,
      tone: "normal",
    },
  ];
  if (feed.mediaFree != null) rows.push({ key: "media", when: "Media", title: `${gib(feed.mediaFree)} GB free`, tone: "normal" });
  return rows;
}

export interface ScreenLine {
  key: string;
  text: string;
}

export function screenLines(card: string, rows: Item[]): ScreenLine[] {
  return rows.map((r) => ({ key: r.key, text: `${card}: ${r.when} ${r.title}` }));
}
