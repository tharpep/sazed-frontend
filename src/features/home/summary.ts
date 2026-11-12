import type { Automation, AutomationDetail } from "@/api/automations";
import type { BacklogItem } from "@/api/backlog";
import type { CalendarEvent } from "@/api/display";
import type { Project } from "@/api/projects";

const DAY_MS = 86_400_000;

export const READY_SHOWN = 3;
export const PROJECTS_SHOWN = 5;

export interface TodayEntry {
  when: string;
  timed: boolean;
  text: string;
}

function hhmm(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** What is left of today: events that have not ended, all-day ones first, then the tasks due. */
export function todayEntries(events: CalendarEvent[], tasksDue: number, now = new Date()): TodayEntry[] {
  const left = events
    .filter((e) => e.all_day || Date.parse(e.end) > now.getTime())
    .sort((a, b) => Number(b.all_day) - Number(a.all_day) || a.start.localeCompare(b.start))
    .map((e) => ({ when: e.all_day ? "all day" : hhmm(new Date(e.start)), timed: !e.all_day, text: e.title }));
  if (tasksDue > 0) {
    left.push({ when: "due", timed: false, text: `${tasksDue} ${tasksDue === 1 ? "task" : "tasks"} due today` });
  }
  return left;
}

function isOpen(item: BacklogItem): boolean {
  return item.status === "new" || item.status === "shortlisted";
}

export function readyCount(items: BacklogItem[]): number {
  return items.filter(isOpen).length;
}

/** The top of Pryce's saved backlog priority; unranked items never make the cut. */
export function topReady(items: BacklogItem[], n = READY_SHOWN): BacklogItem[] {
  return items
    .filter((i) => isOpen(i) && i.rank != null)
    .sort((a, b) => a.rank! - b.rank!)
    .slice(0, n);
}

export function projectsByRank(projects: Project[], n = PROJECTS_SHOWN): Project[] {
  return projects
    .filter((p) => p.state === "active")
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
    .slice(0, n);
}

/** The automation whose last run failed most recently, within the last day. */
export function latestFailure(automations: Automation[], now = new Date()): Automation | null {
  return (
    automations
      .filter((a) => a.last_status === "error" && a.last_run_at && now.getTime() - Date.parse(a.last_run_at) < DAY_MS)
      .sort((a, b) => b.last_run_at!.localeCompare(a.last_run_at!))[0] ?? null
  );
}

export function failedStep(detail: AutomationDetail): string | null {
  return detail.runs[0]?.steps?.find((s) => s.status === "error")?.name ?? null;
}

export function nextRun(automations: Automation[]): Automation | null {
  return (
    automations
      .filter((a) => a.enabled && a.next_run_at)
      .sort((a, b) => a.next_run_at!.localeCompare(b.next_run_at!))[0] ?? null
  );
}

export function ago(iso: string, now = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export function when(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(":00", "");
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / DAY_MS);
  if (days <= 0) return time;
  if (days === 1) return `tomorrow ${time}`;
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${time}`;
}

/** One line from live automation data: the latest failure in a day with its step, else the next run. */
export function runSentence(
  failure: Automation | null,
  step: string | null,
  next: Automation | null,
  now = new Date()
): string | null {
  if (failure) {
    return `${failure.name} failed${step ? ` at the ${step} step` : ""}, ${ago(failure.last_run_at!, now)} ago`;
  }
  if (next) return `Next run: ${next.name}, ${when(next.next_run_at!, now)}`;
  return null;
}
