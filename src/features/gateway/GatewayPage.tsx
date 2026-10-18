import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { getMetrics, type AuditMetrics } from "@/api/audit";
import { errorText } from "@/api/homelab";
import {
  fetchGatewayHealth,
  fetchIntegrations,
  type GatewayHealth,
  type Integrations,
} from "@/api/gateway";
import { useUiStore } from "@/store/uiStore";

// The four Google integrations share one OAuth client, so they're one row here.
const INTEGRATIONS: { key: string; name: string; powers: string }[] = [
  { key: "google_calendar", name: "Google Workspace", powers: "Calendar, Gmail, Tasks, Drive, Sheets" },
  { key: "anthropic", name: "Anthropic", powers: "Sazed's models, /ai" },
  { key: "openrouter", name: "OpenRouter", powers: "Other models via /ai" },
  { key: "tavily", name: "Tavily", powers: "Web search and page fetch" },
  { key: "gnews", name: "GNews", powers: "News search" },
  { key: "github", name: "GitHub", powers: "Repos, issues, PRs" },
  { key: "google_maps", name: "Google Maps", powers: "Place search" },
  { key: "pushover", name: "Pushover", powers: "Push notifications" },
  { key: "proxmox", name: "Proxmox", powers: "Homelab status and restarts" },
  { key: "knowledge_base", name: "Knowledge base", powers: "RAG search" },
  { key: "database", name: "Postgres", powers: "Journal, finance, service history" },
];

const RANGES = [
  { hours: 24, label: "24h" },
  { hours: 24 * 7, label: "7 days" },
  { hours: 24 * 30, label: "30 days" },
] as const;

export function GatewayPage() {
  const toggleAudit = useUiStore((s) => s.toggleAudit);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [health, setHealth] = useState<GatewayHealth | null>(null);
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [hours, setHours] = useState<number>(24);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (sinceHours: number) => {
    setLoading(true);
    const [i, h, m] = await Promise.allSettled([
      fetchIntegrations(),
      fetchGatewayHealth(),
      getMetrics(sinceHours),
    ]);
    const failed: string[] = [];
    if (i.status === "fulfilled") setIntegrations(i.value);
    else failed.push(`integrations: ${errorText(i.reason)}`);
    if (h.status === "fulfilled") setHealth(h.value);
    else failed.push(`gateway: ${errorText(h.reason)}`);
    if (m.status === "fulfilled") setMetrics(m.value);
    else failed.push(`usage: ${errorText(m.reason)}`);
    setErrors(failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(hours);
  }, [load, hours]);

  const rows = INTEGRATIONS.map((d) => ({ ...d, status: integrations?.[d.key] }));
  const missing = rows.filter((r) => r.status && !r.status.connected);
  const known = rows.filter((r) => r.status);

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold text-ink">Gateway</h1>
        <button
          type="button"
          onClick={() => load(hours)}
          disabled={loading}
          aria-label="Refresh"
          title="Refresh"
          className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-4 pb-8">
          {errors.length > 0 && (
            <p className="text-sm text-destructive">Couldn't load {errors.join("; ")}</p>
          )}

          <Section title="Integrations">
            {integrations && (
              <p className="px-1 text-sm text-ink">
                {known.length - missing.length} of {known.length} connected
                {missing.length > 0 && (
                  <span className="text-muted"> · not set up: {missing.map((r) => r.name).join(", ")}</span>
                )}
              </p>
            )}
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {rows.map((r) => (
                <li key={r.key} className="flex min-h-[52px] items-center gap-3 px-3 py-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-block size-2 shrink-0 rounded-full",
                      !r.status
                        ? "border border-dashed border-muted" // gateway doesn't report this one
                        : r.status.connected
                          ? "bg-muted"
                          : "border border-muted"
                    )}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm text-ink">{r.name}</span>
                    <span className="truncate text-xs text-muted">{r.powers}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {!r.status ? "…" : r.status.connected ? (r.status.status === "ok" ? "Connected" : r.status.status) : "Not set up"}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Model spend"
            action={
              <div className="flex gap-1" role="group" aria-label="Time range">
                {RANGES.map((r) => (
                  <button
                    key={r.hours}
                    type="button"
                    onClick={() => setHours(r.hours)}
                    aria-pressed={hours === r.hours}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs transition-colors",
                      hours === r.hours ? "bg-surface text-primary" : "text-muted hover:text-ink"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            }
          >
            {metrics && (
              <>
                <p className="px-1 text-sm text-ink">
                  {usd(metrics.llm.total_cost_usd)}
                  <span className="text-muted">
                    {" "}· {metrics.llm.total_calls} model calls · {tokens(metrics.llm.total_input_tokens)} in,{" "}
                    {tokens(metrics.llm.total_output_tokens)} out
                  </span>
                </p>
                <Table
                  rows={Object.entries(metrics.llm.by_model)
                    .sort(([, a], [, b]) => b.cost_usd - a.cost_usd)
                    .map(([model, u]) => [
                      modelName(model),
                      `${u.calls} call${u.calls === 1 ? "" : "s"}`,
                      usd(u.cost_usd),
                    ])}
                  empty="No model calls in this range."
                />
                {Object.keys(metrics.llm.by_purpose).length > 0 && (
                  <p className="px-1 text-xs text-muted">
                    By use:{" "}
                    {Object.entries(metrics.llm.by_purpose)
                      .sort(([, a], [, b]) => b.cost_usd - a.cost_usd)
                      .map(([p, u]) => `${p} ${usd(u.cost_usd)}`)
                      .join(" · ")}
                  </p>
                )}
              </>
            )}
          </Section>

          <Section
            title="Sazed tool calls"
            action={
              <button type="button" onClick={toggleAudit} className="text-xs text-primary hover:underline">
                Open tool log
              </button>
            }
          >
            {metrics && (
              <>
                <p className="px-1 text-sm text-ink">
                  {metrics.tools.total_calls} calls
                  {metrics.tools.success_rate != null && (
                    <span className="text-muted">
                      {" "}· {Math.round(metrics.tools.success_rate * 100)}% succeeded · median{" "}
                      {metrics.tools.duration_ms_p50} ms · p95 {metrics.tools.duration_ms_p95} ms
                    </span>
                  )}
                </p>
                <Table
                  rows={metrics.tools.top_by_call_count.slice(0, 6).map((t) => [t.tool_name, `${t.count}`, ""])}
                  empty="No tool calls in this range."
                />
                {metrics.tools.top_by_error_count.length > 0 && (
                  <p className="px-1 text-xs text-destructive">
                    Errors:{" "}
                    {metrics.tools.top_by_error_count.map((t) => `${t.tool_name} (${t.count})`).join(", ")}
                  </p>
                )}
              </>
            )}
          </Section>

          {health && (
            <Section title="What the gateway can do">
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {health.endpoints.map((e) => (
                  <li key={e.path} className="flex flex-col gap-0.5 px-3 py-2">
                    <span className="flex items-baseline justify-between gap-3">
                      <code className="text-sm text-ink">{e.path}</code>
                      {e.provider && <span className="truncate text-xs text-muted">{e.provider}</span>}
                    </span>
                    <span className="text-xs text-muted">{e.description}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-medium text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Table({ rows, empty }: { rows: [string, string, string][]; empty: string }) {
  if (rows.length === 0) return <p className="px-1 text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border text-sm">
      {rows.map(([a, b, c]) => (
        <li key={a} className="flex items-center gap-3 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-ink">{a}</span>
          <span className="shrink-0 text-muted">{b}</span>
          {c && <span className="w-16 shrink-0 text-right text-ink">{c}</span>}
        </li>
      ))}
    </ul>
  );
}

/** claude-haiku-5-5 → "Haiku 5.5", claude-sonnet-5 → "Sonnet 5"; anything else unchanged. */
function modelName(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d+))?(?:-\d{8})?$/.exec(id);
  if (!m) return id;
  const family = m[1][0].toUpperCase() + m[1].slice(1);
  const minor = m[3] && m[3].length <= 2 ? `.${m[3]}` : "";
  return `${family} ${m[2]}${minor}`;
}

function usd(n: number): string {
  if (n === 0) return "$0";
  return n < 0.01 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`;
}

function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}
