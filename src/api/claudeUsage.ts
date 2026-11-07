import { apiFetch } from "./client";

export interface UsageLimits {
  context_soft: number;
  context_hard: number;
}

export interface UsageTiles {
  sessions: number;
  prompts: number;
  peak_context_max: number | null;
  peak_context_median: number | null;
  sessions_over_soft: number;
  sessions_over_hard: number;
  confusion_rate: number | null;
  bash_writes: number;
  edit_writes: number;
  bash_write_share: number | null;
  tool_calls_per_prompt: number | null;
  skills_used: number;
}

export interface UsageWeek {
  week: string;
  prompts: number;
  sessions: number;
  confusion_rate: number | null;
  bash_writes: number;
  edit_writes: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
  main_cost_usd: number;
  subagent_cost_usd: number;
  side_cost_usd: number;
  sazed_cost_usd: number;
  cost_per_prompt_usd: number | null;
}

export interface SpendTally {
  usd: number;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}

export type SpendSource = "main" | "subagents" | "side_calls" | "sazed_api" | "sazed_jobs";

export interface UsageSpend {
  prices_as_of: string;
  total_usd: number;
  cost_per_prompt_usd: number | null;
  cache_savings_usd: number;
  sources: (SpendTally & { source: SpendSource })[];
  models: (SpendTally & { model: string; share: number | null })[];
  side_calls: (SpendTally & { query_source: string })[];
  unpriced: { model: string; calls: number }[];
}

export interface UsageOverview {
  range: { from: string; to: string };
  limits: UsageLimits;
  machines: string[];
  tiles: UsageTiles;
  weekly: UsageWeek[];
  spend: UsageSpend;
  models: { model: string; responses: number; share: number }[];
  skills: { name: string; count: number }[];
  subagents: { type: string; count: number }[];
  slash_commands: { command: string; count: number }[];
  styles: { style: string; prompts: number; confusion_rate: number | null }[];
}

export interface UsageSession {
  session_id: string;
  machine: string;
  project: string | null;
  title: string | null;
  first_ts: string;
  last_ts: string;
  prompts: number;
  peak_context: number;
  main_model: string | null;
  cost_usd: number;
  subagent_cost_usd: number;
  side_cost_usd: number;
  subagents: number;
  compactions: number;
  interrupts: number;
  confused_prompts: { ts: string; context: number }[];
  context_series: { ts: string; context: number }[];
}

export interface UsageSessions {
  limits: UsageLimits;
  sessions: UsageSession[];
}

export interface UsageQuery {
  days: number;
  machine: string | null;
}

function params({ days, machine }: UsageQuery): URLSearchParams {
  const q = new URLSearchParams({ days: String(days) });
  if (machine) q.set("machine", machine);
  return q;
}

export async function getUsageOverview(query: UsageQuery): Promise<UsageOverview> {
  if (import.meta.env.VITE_CLAUDE_USAGE_MOCK) {
    return (await import("@/mock/claudeUsage")).mockOverview(query);
  }
  return apiFetch(`/claude-usage/overview?${params(query)}`) as Promise<UsageOverview>;
}

export async function listUsageSessions(query: UsageQuery): Promise<UsageSessions> {
  if (import.meta.env.VITE_CLAUDE_USAGE_MOCK) {
    return (await import("@/mock/claudeUsage")).mockSessions(query);
  }
  return apiFetch(`/claude-usage/sessions?${params(query)}`) as Promise<UsageSessions>;
}
