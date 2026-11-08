import type { HubDay, HubLimit, HubSource, UsageHub } from "@/api/claudeUsage";
import type { Tone } from "@/components/system";

export type Metric = "api_equivalent" | "billed" | "tokens";
export type GroupBy = "source" | "model" | "machine";
export type Tab = "overview" | "claude_code" | "worker" | "sazed_api";

const STALE_MS = 3 * 86_400_000;
export const MAX_SERIES = 4;

export const SOURCE_NAME: Record<string, string> = {
  claude_code: "Claude Code",
  worker_claude: "Worker, Claude jobs",
  worker_agy: "Worker, Gemini jobs",
  sazed_api: "Sazed API",
};

export const SOURCE_METHOD: Record<string, string> = {
  claude_code: "SessionEnd push",
  worker_claude: "job usage",
  worker_agy: "job usage, tokens only",
  sazed_api: "llm_calls, billed",
};

export const SOURCE_TAB: Record<string, Tab> = {
  claude_code: "claude_code",
  worker_claude: "worker",
  worker_agy: "worker",
  sazed_api: "sazed_api",
};

export const WINDOW_NAME: Record<HubLimit["window"], string> = {
  five_hour: "5-hour window",
  seven_day: "Weekly, all models",
};

export const READING_SOURCE: Record<string, string> = {
  job: "worker job",
  probe: "homelab probe",
  dispatch: "dispatch",
};

export function sourceLabel(source: string, machine: string): string {
  const name = SOURCE_NAME[source] ?? source;
  return source === "claude_code" ? `${name}, ${machine}` : name;
}

export function freshTokens(d: HubDay): number {
  return d.input_tokens + d.output_tokens + d.cache_write_tokens + d.thinking_tokens;
}

export function metricValue(d: HubDay, metric: Metric): number {
  if (metric === "tokens") return freshTokens(d);
  return d.kind === metric ? (d.usd ?? 0) : 0;
}

export function groupKey(d: HubDay, by: GroupBy): string {
  if (by === "model") return (d.model ?? "unknown").replace(/^claude-/, "");
  if (by === "machine") return d.machine;
  return sourceLabel(d.source, d.machine);
}

export function rangeDays(hub: UsageHub): string[] {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: hub.timezone });
  const out: string[] = [];
  const end = Date.parse(hub.range.to);
  for (let t = Date.parse(hub.range.from); t <= end + 1; t += 86_400_000) {
    const day = fmt.format(t);
    if (out[out.length - 1] !== day) out.push(day);
  }
  const last = fmt.format(end);
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

export interface Series {
  key: string;
  values: number[];
  total: number;
}

export function buildSeries(days: string[], rows: HubDay[], metric: Metric, by: GroupBy): Series[] {
  const index = new Map(days.map((d, i) => [d, i]));
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const i = index.get(r.day);
    const v = metricValue(r, metric);
    if (i === undefined || v === 0) continue;
    const key = groupKey(r, by);
    const values = groups.get(key) ?? days.map(() => 0);
    values[i] += v;
    groups.set(key, values);
  }
  const ranked = [...groups.entries()]
    .map(([key, values]) => ({ key, values, total: values.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
  if (ranked.length <= MAX_SERIES) return ranked;
  const head = ranked.slice(0, MAX_SERIES - 1);
  const rest = ranked.slice(MAX_SERIES - 1);
  const values = days.map((_, i) => rest.reduce((n, s) => n + s.values[i], 0));
  return [...head, { key: "Other", values, total: values.reduce((a, b) => a + b, 0) }];
}

export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return "never";
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export function until(iso: string | null, now = Date.now()): string {
  if (!iso) return "";
  const minutes = Math.max(0, Math.round((Date.parse(iso) - now) / 60_000));
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `in ${hours} h ${minutes % 60} m`;
  return `in ${Math.floor(hours / 24)} d ${hours % 24} h`;
}

export function windowTone(limit: HubLimit): Tone {
  if (limit.reset_since) return "neutral";
  if (limit.used_pct >= 100 || limit.status === "rejected") return "err";
  if (limit.used_pct >= 75) return "warn";
  return "neutral";
}

export function paceTone(limit: HubLimit): Tone {
  const tone = windowTone(limit);
  if (tone !== "neutral" || limit.reset_since) return tone;
  return limit.full_at ? "warn" : "neutral";
}

export function clock(iso: string, now = Date.now()): string {
  const time = new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const sameDay = new Date(iso).toDateString() === new Date(now).toDateString();
  return sameDay ? time : `${new Date(iso).toLocaleDateString(undefined, { weekday: "short" })} ${time}`;
}

export function span(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

export function paceSentence(limit: HubLimit, now = Date.now()): string | null {
  if (limit.reset_since) return limit.resets_at ? `Reset at ${clock(limit.resets_at, now)}. No reading since.` : "Reset. No reading since.";
  if (limit.used_pct >= 100 || limit.status === "rejected") return limit.resets_at ? `At the limit until ${clock(limit.resets_at, now)}.` : "At the limit.";
  const parts: string[] = [];
  if (limit.full_at && limit.resets_at) {
    const early = span(Date.parse(limit.resets_at) - Date.parse(limit.full_at));
    parts.push(`Full around ${clock(limit.full_at, now)} at the recent pace, ${early} before the reset.`);
  } else if (limit.projected_pct != null) {
    const under = limit.even_pct != null && limit.used_pct < limit.even_pct ? "Under even pace. " : "";
    parts.push(`${under}On pace for ${Math.round(limit.projected_pct)}% by the reset.`);
  }
  if (limit.allowance_per_day != null && limit.resets_at) {
    const day = new Date(limit.resets_at).toLocaleDateString(undefined, { weekday: "long" });
    parts.push(`An even pace to ${day} is ${limit.allowance_per_day}% a day.`);
  }
  return parts.length ? parts.join(" ") : null;
}

export function feedTone(s: HubSource, now = Date.now()): Tone {
  if (s.source !== "claude_code") return "neutral";
  if (!s.last_at || now - Date.parse(s.last_at) > STALE_MS) return "warn";
  return "neutral";
}

export function feedVerb(source: string): string {
  if (source === "claude_code") return "last push";
  if (source === "sazed_api") return "last call";
  return "last job";
}
