import type { HubDay, PlanPeriod, UsageHub, UsageKind, UsageOverview, UsageQuery, UsageSession, UsageSessions } from "@/api/claudeUsage";

const LIMITS = { context_soft: 200_000, context_hard: 400_000 };
const HOME = "/home/tharpep/code";

interface Spec {
  id: string;
  machine?: string;
  project: string;
  title: string | null;
  start: string;
  hours: number;
  prompts: number;
  peak: number;
  model: string;
  subagents: number;
  compactions: number;
  interrupts: number;
  confused: number;
}

const OPUS = "claude-opus-5-5";
const FABLE = "claude-fable-5";
const SONNET = "claude-sonnet-5-5";

const SPECS: Spec[] = [
  { id: "s01", project: "chat-service", title: "engine-tab-model-bake-off", start: "2026-11-04T13:10:00Z", hours: 9, prompts: 54, peak: 965_000, model: OPUS, subagents: 6, compactions: 0, interrupts: 4, confused: 3 },
  { id: "s02", project: "chat-service", title: "PR 30 phase 1", start: "2026-11-02T15:00:00Z", hours: 7, prompts: 36, peak: 944_000, model: OPUS, subagents: 4, compactions: 0, interrupts: 2, confused: 2 },
  { id: "s03", project: "kelsier", title: "Kelsier TUI visual design", start: "2026-10-30T01:00:00Z", hours: 8, prompts: 42, peak: 825_000, model: OPUS, subagents: 3, compactions: 1, interrupts: 5, confused: 2 },
  { id: "s04", project: "kelsier", title: "sidebar-m3-frames", start: "2026-10-28T14:30:00Z", hours: 6, prompts: 40, peak: 811_000, model: OPUS, subagents: 2, compactions: 0, interrupts: 3, confused: 1 },
  { id: "s05", project: "kelsier", title: "add-sidebar-plumbing", start: "2026-10-26T18:00:00Z", hours: 4, prompts: 19, peak: 696_000, model: FABLE, subagents: 1, compactions: 0, interrupts: 1, confused: 0 },
  { id: "s06", project: "kelsier", title: "Kelsier UI and UX audit", start: "2026-10-23T12:00:00Z", hours: 5, prompts: 22, peak: 669_000, model: OPUS, subagents: 5, compactions: 0, interrupts: 2, confused: 1 },
  { id: "s07", project: "ai-context", title: "Claude setup review", start: "2026-10-20T16:00:00Z", hours: 3, prompts: 23, peak: 333_000, model: SONNET, subagents: 2, compactions: 0, interrupts: 0, confused: 1 },
  { id: "s08", project: "sazed", title: "backlog scout triage", start: "2026-11-05T02:00:00Z", hours: 1, prompts: 3, peak: 395_000, model: OPUS, subagents: 1, compactions: 0, interrupts: 0, confused: 0 },
  { id: "s09", project: "sazed-frontend", title: "activity page spacing", start: "2026-11-03T22:00:00Z", hours: 1, prompts: 3, peak: 388_000, model: OPUS, subagents: 0, compactions: 0, interrupts: 1, confused: 0 },
  { id: "s10", project: "sazed", title: null, start: "2026-11-01T19:00:00Z", hours: 1, prompts: 4, peak: 351_000, model: OPUS, subagents: 0, compactions: 0, interrupts: 0, confused: 0 },
  { id: "s11", project: "ai-context", title: "hook gate tweaks", start: "2026-10-31T13:00:00Z", hours: 1, prompts: 2, peak: 280_000, model: SONNET, subagents: 0, compactions: 0, interrupts: 0, confused: 0 },
  { id: "s12", project: "kelsier", title: null, start: "2026-10-29T03:00:00Z", hours: 1, prompts: 2, peak: 240_000, model: OPUS, subagents: 0, compactions: 0, interrupts: 0, confused: 0 },
  { id: "s13", project: "chat-service", title: "stream cancel bug", start: "2026-10-27T21:00:00Z", hours: 1, prompts: 3, peak: 171_000, model: OPUS, subagents: 0, compactions: 0, interrupts: 1, confused: 0 },
  { id: "s14", project: "sazed-frontend", title: "tab bar label", start: "2026-10-25T17:00:00Z", hours: 1, prompts: 2, peak: 120_000, model: SONNET, subagents: 0, compactions: 0, interrupts: 0, confused: 0 },
  { id: "s15", project: "sazed", title: "cron preview endpoint", start: "2026-10-22T14:00:00Z", hours: 1, prompts: 3, peak: 88_000, model: OPUS, subagents: 0, compactions: 0, interrupts: 0, confused: 0 },
  { id: "s16", project: "ai-context", title: null, start: "2026-10-18T20:00:00Z", hours: 1, prompts: 2, peak: 64_000, model: SONNET, subagents: 0, compactions: 0, interrupts: 0, confused: 0 },
  { id: "s17", project: "chat-service", title: "rename env var", start: "2026-10-15T15:00:00Z", hours: 1, prompts: 1, peak: 41_000, model: OPUS, subagents: 0, compactions: 0, interrupts: 0, confused: 0 },
  { id: "s18", project: "kelsier", title: null, start: "2026-10-12T13:00:00Z", hours: 1, prompts: 2, peak: 22_000, model: SONNET, subagents: 0, compactions: 0, interrupts: 0, confused: 0 },
  { id: "s19", project: "sazed-frontend", title: "typo in README", start: "2026-10-09T12:00:00Z", hours: 1, prompts: 1, peak: 9_000, model: SONNET, subagents: 0, compactions: 0, interrupts: 0, confused: 0 },
];

function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function contextAt(spec: Spec, f: number, i: number): number {
  const wobble = 1 + (noise(i + spec.peak) - 0.5) * 0.06;
  if (spec.compactions === 0) return Math.round(spec.peak * (0.08 + 0.92 * f ** 0.85) * wobble);
  if (f < 0.55) return Math.round(spec.peak * (0.1 + 0.9 * (f / 0.55) ** 0.85) * wobble);
  return Math.round(spec.peak * (0.28 + 0.5 * ((f - 0.55) / 0.45)) * wobble);
}

function build(spec: Spec): UsageSession {
  const t0 = Date.parse(spec.start);
  const span = spec.hours * 3_600_000;
  const points = Math.min(60, Math.max(3, spec.prompts * 2));
  const at = (f: number) => new Date(t0 + f * span).toISOString();
  const series = Array.from({ length: points }, (_, i) => {
    const f = i / (points - 1);
    return { ts: at(f), context: Math.min(spec.peak, contextAt(spec, f, i)) };
  });
  const peakIndex = spec.compactions === 0 ? points - 1 : Math.round(0.55 * (points - 1));
  series[peakIndex] = { ts: series[peakIndex].ts, context: spec.peak };
  const confused = Array.from({ length: spec.confused }, (_, k) => {
    const f = 0.35 + (0.6 * (k + 1)) / (spec.confused + 1);
    const nearest = series[Math.round(f * (points - 1))];
    return { ts: at(f), context: nearest.context };
  });
  return {
    session_id: spec.id,
    machine: spec.machine ?? "desktop-wsl",
    project: `${HOME}/${spec.project}`,
    title: spec.title,
    first_ts: at(0),
    last_ts: at(1),
    prompts: spec.prompts,
    peak_context: spec.peak,
    main_model: spec.model,
    cost_usd: spec.prompts * 2.1,
    subagent_cost_usd: spec.subagents * 1.4,
    side_cost_usd: spec.prompts * 0.05,
    subagents: spec.subagents,
    compactions: spec.compactions,
    interrupts: spec.interrupts,
    confused_prompts: confused,
    context_series: series,
  };
}

const SESSIONS = SPECS.map(build).sort((a, b) => b.first_ts.localeCompare(a.first_ts));

export function mockSessions({ machine }: UsageQuery): UsageSessions {
  return {
    limits: LIMITS,
    sessions: machine ? SESSIONS.filter((s) => s.machine === machine) : SESSIONS,
  };
}

export function mockOverview({ days }: UsageQuery): UsageOverview {
  return {
    range: { from: new Date(Date.parse("2026-11-06T00:00:00Z") - days * 86_400_000).toISOString(), to: "2026-11-06T00:00:00Z" },
    limits: LIMITS,
    machines: ["desktop-wsl", "macbook"],
    tiles: {
      sessions: 19,
      prompts: 264,
      peak_context_max: 965_000,
      peak_context_median: 333_000,
      sessions_over_soft: 12,
      sessions_over_hard: 6,
      confusion_rate: 0.038,
      bash_writes: 1215,
      edit_writes: 161,
      bash_write_share: 0.883,
      tool_calls_per_prompt: 13.0,
      skills_used: 7,
    },
    weekly: [
      { week: "2026-W41", prompts: 9, sessions: 3, confusion_rate: 0, bash_writes: 18, edit_writes: 9, output_tokens: 310_000, cache_read_tokens: 48_000_000, input_tokens: 40_000, cache_write_tokens: 9_000_000, cost_usd: 10.8, main_cost_usd: 9.4, subagent_cost_usd: 1.1, side_cost_usd: 0.2, sazed_cost_usd: 0.3, cost_per_prompt_usd: 1.1667 },
      { week: "2026-W42", prompts: 14, sessions: 3, confusion_rate: 0.071, bash_writes: 36, edit_writes: 14, output_tokens: 520_000, cache_read_tokens: 91_000_000, input_tokens: 40_000, cache_write_tokens: 9_000_000, cost_usd: 25.6, main_cost_usd: 22.8, subagent_cost_usd: 2.4, side_cost_usd: 0.5, sazed_cost_usd: 0.4, cost_per_prompt_usd: 1.8 },
      { week: "2026-W43", prompts: 21, sessions: 3, confusion_rate: 0.048, bash_writes: 112, edit_writes: 17, output_tokens: 1_400_000, cache_read_tokens: 410_000_000, input_tokens: 40_000, cache_write_tokens: 9_000_000, cost_usd: 71.9, main_cost_usd: 61.5, subagent_cost_usd: 9.8, side_cost_usd: 1.1, sazed_cost_usd: 0.6, cost_per_prompt_usd: 3.3952 },
      { week: "2026-W44", prompts: 82, sessions: 5, confusion_rate: 0.037, bash_writes: 441, edit_writes: 61, output_tokens: 3_600_000, cache_read_tokens: 1_020_000_000, input_tokens: 40_000, cache_write_tokens: 9_000_000, cost_usd: 174.1, main_cost_usd: 142.0, subagent_cost_usd: 31.2, side_cost_usd: 2.6, sazed_cost_usd: 0.9, cost_per_prompt_usd: 2.1122 },
      { week: "2026-W45", prompts: 138, sessions: 5, confusion_rate: 0.036, bash_writes: 608, edit_writes: 60, output_tokens: 5_100_000, cache_read_tokens: 1_790_000_000, input_tokens: 40_000, cache_write_tokens: 9_000_000, cost_usd: 260.1, main_cost_usd: 210.3, subagent_cost_usd: 48.6, side_cost_usd: 3.9, sazed_cost_usd: 1.2, cost_per_prompt_usd: 1.8761 },
    ],
    spend: {
      prices_as_of: "2026-11-06",
      total_usd: 540.5,
      cost_per_prompt_usd: 2.03,
      cache_savings_usd: 5930.0,
      sources: [
        { source: "main", usd: 446.0, calls: 3681, input_tokens: 120_000, output_tokens: 6_100_000, cache_read_tokens: 2_900_000_000, cache_write_tokens: 41_000_000 },
        { source: "subagents", usd: 93.1, calls: 1958, input_tokens: 60_000, output_tokens: 2_400_000, cache_read_tokens: 410_000_000, cache_write_tokens: 12_000_000 },
        { source: "side_calls", usd: 8.3, calls: 1240, input_tokens: 900_000, output_tokens: 310_000, cache_read_tokens: 22_000_000, cache_write_tokens: 1_100_000 },
        { source: "sazed_api", usd: 3.4, calls: 410, input_tokens: 2_100_000, output_tokens: 190_000, cache_read_tokens: 6_000_000, cache_write_tokens: 400_000 },
      ],
      models: [
        { model: OPUS, usd: 348.0, share: 0.644, calls: 3132, input_tokens: 90_000, output_tokens: 2_900_000, cache_read_tokens: 1_240_000_000, cache_write_tokens: 30_000_000 },
        { model: FABLE, usd: 144.2, share: 0.267, calls: 600, input_tokens: 20_000, output_tokens: 610_000, cache_read_tokens: 290_000_000, cache_write_tokens: 9_000_000 },
        { model: SONNET, usd: 48.3, share: 0.089, calls: 1907, input_tokens: 2_170_000, output_tokens: 5_180_000, cache_read_tokens: 1_786_000_000, cache_write_tokens: 14_400_000 },
      ],
      side_calls: [
        { query_source: "auto_mode", usd: 5.1, calls: 980, input_tokens: 700_000, output_tokens: 90_000, cache_read_tokens: 15_000_000, cache_write_tokens: 600_000 },
        { query_source: "compact", usd: 2.4, calls: 14, input_tokens: 150_000, output_tokens: 200_000, cache_read_tokens: 6_000_000, cache_write_tokens: 400_000 },
        { query_source: "generate_session_title", usd: 0.8, calls: 246, input_tokens: 50_000, output_tokens: 20_000, cache_read_tokens: 1_000_000, cache_write_tokens: 100_000 },
      ],
      unpriced: [{ model: "<synthetic>", calls: 12 }],
    },
    models: [
      { model: OPUS, responses: 6180, share: 0.848 },
      { model: FABLE, responses: 766, share: 0.105 },
      { model: SONNET, responses: 343, share: 0.047 },
    ],
    skills: [
      { name: "pryce:log", count: 4 },
      { name: "pryce:scope", count: 3 },
      { name: "browser", count: 3 },
      { name: "pryce:learn", count: 2 },
      { name: "code-review", count: 2 },
      { name: "pryce:where", count: 1 },
      { name: "simplify", count: 1 },
    ],
    subagents: [
      { type: "general-purpose", count: 29 },
      { type: "Explore", count: 14 },
      { type: "code-review", count: 6 },
      { type: "Plan", count: 3 },
    ],
    slash_commands: [
      { command: "/model", count: 12 },
      { command: "/clear", count: 9 },
      { command: "/compact", count: 4 },
      { command: "/resume", count: 3 },
      { command: "/context", count: 2 },
    ],
    styles: [
      { style: "Concise", prompts: 200, confusion_rate: 0.03 },
      { style: "Default", prompts: 52, confusion_rate: 0.058 },
      { style: "custom", prompts: 12, confusion_rate: 0.083 },
    ],
  };
}

const HUB_NOW = Date.now();
const DAY_MS = 86_400_000;

function hubDay(source: string, machine: string, model: string, kind: UsageKind, day: string, scale: number, usd: number | null): HubDay {
  return {
    day,
    source,
    machine,
    model,
    kind,
    calls: Math.max(1, Math.round(scale * 40)),
    input_tokens: Math.round(scale * 90_000),
    output_tokens: Math.round(scale * 210_000),
    cache_read_tokens: Math.round(scale * 110_000_000),
    cache_write_tokens: Math.round(scale * 2_400_000),
    thinking_tokens: kind === "tokens" ? Math.round(scale * 30_000) : 0,
    usd,
  };
}

export function mockHub(days: number): UsageHub {
  const out: HubDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(HUB_NOW - i * DAY_MS).toISOString().slice(0, 10);
    const wsl = 20 + 45 * noise(i * 3 + 1);
    const win = i < 4 ? 100 + 25 * noise(i) : 10 + 60 * noise(i * 5 + 2);
    if (noise(i * 7) > 0.15) out.push(hubDay("claude_code", "desktop-wsl", "claude-opus-5-5", "api_equivalent", day, wsl / 60, Math.round(wsl * 100) / 100));
    if (noise(i * 11 + 4) > 0.2) out.push(hubDay("claude_code", "windows", "claude-opus-5-5", "api_equivalent", day, win / 60, Math.round(win * 100) / 100));
    if (i % 4 === 1) out.push(hubDay("worker_claude", "homelab", "claude-sonnet-5-5", "api_equivalent", day, 0.05, Math.round(900 * noise(i + 9)) / 100));
    out.push(hubDay("worker_agy", "homelab", "gemini-3.8-flash-high", "tokens", day, 0.08 + 0.2 * noise(i + 3), null));
    if (noise(i * 13 + 6) > 0.3) out.push(hubDay("sazed_api", "sazed", "claude-haiku-5-5", "billed", day, 0.002, Math.round(30 * noise(i + 1)) / 100));
  }
  const ago = (ms: number) => new Date(HUB_NOW - ms).toISOString();
  const resets = (ms: number) => new Date(HUB_NOW + ms).toISOString();
  const points = (start: number, end: number) =>
    Array.from({ length: 6 }, (_, k) => ({ read_at: ago((5 - k) * 18 * 60_000), used_pct: Math.round(start + ((end - start) * k) / 5) }));
  return {
    range: { from: ago(days * DAY_MS), to: ago(0) },
    timezone: "America/New_York",
    prices_as_of: "2026-11-06",
    limits: [
      { window: "five_hour", used_pct: 56, resets_at: resets(166 * 60_000), read_at: ago(2 * 60_000), status: "allowed", source: "probe", machine: "homelab", reset_since: false, even_pct: 44.7, projected_pct: 100, full_at: resets(101 * 60_000), allowance_per_day: null, points: points(20, 56) },
      { window: "seven_day", used_pct: 91, resets_at: resets(2.53 * DAY_MS), read_at: ago(2 * 60_000), status: "allowed_warning", source: "dispatch", machine: "PryceSurface", reset_since: false, even_pct: 63.9, projected_pct: 100, full_at: resets(5 * 3_600_000), allowance_per_day: 3.6, points: points(80, 91) },
    ],
    billed: { month: "2026-11", usd: 0.59, alert_usd: 25, unpriced: [] },
    value: plans.length
      ? { plan: plans[plans.length - 1].plan, monthly_usd: plans[plans.length - 1].monthly_usd, since: ago(days * DAY_MS).slice(0, 10), plan_usd: 97, api_equivalent_usd: 2052, multiple: 21.2 }
      : null,
    days: out,
    sources: [
      { source: "claude_code", machine: "desktop-wsl", last_at: ago(12 * 60_000) },
      { source: "claude_code", machine: "windows", last_at: ago(3 * 3_600_000) },
      { source: "claude_code", machine: "macbook", last_at: ago(9 * DAY_MS) },
      { source: "worker_claude", machine: "homelab", last_at: ago(26 * 3_600_000) },
      { source: "worker_agy", machine: "homelab", last_at: ago(40 * 60_000) },
      { source: "sazed_api", machine: "sazed", last_at: ago(5 * 3_600_000) },
    ],
    unpriced: [],
  };
}

const plans: PlanPeriod[] = [{ starts_on: "2026-10-05", plan: "Max", monthly_usd: 100 }];

export function mockSavePlan(period: PlanPeriod): { periods: PlanPeriod[] } {
  plans.push(period);
  return { periods: plans };
}
