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

export const SOURCE_TAB: Record<string, Tab> = {
  claude_code: "claude_code",
  worker_claude: "worker",
  worker_agy: "worker",
  sazed_api: "sazed_api",
};

export const WINDOW_NAME: Record<HubLimit["window"], string> = {
  five_hour: "5-hour window",
  seven_day: "7-day window",
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
  if (limit.used_pct >= 95) return "err";
  if (limit.used_pct >= 75) return "warn";
  return "neutral";
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
