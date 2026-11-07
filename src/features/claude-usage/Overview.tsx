import { useState } from "react";

import type { HubDay, HubLimit, HubSource, UsageHub } from "@/api/claudeUsage";
import { Segmented, toneDot, toneText } from "@/components/system";
import { cn } from "@/lib/utils";
import { CostChart } from "./CostChart";
import { dollars, shortTime, tokens } from "./format";
import {
  ago,
  feedTone,
  feedVerb,
  freshTokens,
  rangeDays,
  SOURCE_TAB,
  sourceLabel,
  type GroupBy,
  type Metric,
  type Tab,
  until,
  WINDOW_NAME,
  windowTone,
} from "./hub";

const METRICS: { value: Metric; label: string }[] = [
  { value: "api_equivalent", label: "API-equivalent" },
  { value: "billed", label: "Billed" },
  { value: "tokens", label: "Tokens" },
];
const GROUPS: { value: GroupBy; label: string }[] = [
  { value: "source", label: "Source" },
  { value: "model", label: "Model" },
  { value: "machine", label: "Machine" },
];

function Meter({ pct, tone, mark }: { pct: number; tone: string; mark?: number | null }) {
  return (
    <div className="relative h-2 rounded-full bg-raised">
      <div className={cn("absolute inset-y-0 left-0 rounded-full", tone)} style={{ width: `${Math.min(pct, 100)}%` }} />
      {mark != null && mark > pct && (
        <div
          className="absolute -inset-y-0.5 border-l-2 border-dashed border-ink-2"
          style={{ left: `${Math.min(mark, 100)}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function LimitCell({ limit }: { limit: HubLimit | undefined; }) {
  if (!limit) return null;
  const tone = windowTone(limit);
  const fill = tone === "neutral" ? "bg-ink-2" : tone === "warn" ? "bg-warn" : "bg-err";
  const notes = limit.reset_since
    ? [`reset since the last reading ${ago(limit.read_at)}`]
    : [
        limit.projected_pct != null ? `${Math.round(limit.projected_pct)}% by reset at this pace` : null,
        `reading ${ago(limit.read_at)}`,
      ].filter(Boolean);
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-4 py-3">
      <div className="flex justify-between gap-2 text-caption text-muted">
        <span>{WINDOW_NAME[limit.window]}</span>
        {limit.resets_at && !limit.reset_since && (
          <span title={until(limit.resets_at)}>resets {shortTime(limit.resets_at)}</span>
        )}
      </div>
      <span className={cn("font-mono text-heading", limit.reset_since ? "text-muted" : toneText[tone] === "text-muted" ? "text-ink" : toneText[tone])}>
        {Math.round(limit.used_pct)}%
      </span>
      <Meter pct={limit.reset_since ? 0 : limit.used_pct} tone={fill} mark={limit.reset_since ? null : limit.projected_pct} />
      <span className="text-caption text-ink-2">{notes.join(" · ")}</span>
    </div>
  );
}

function BilledCell({ hub, apiEquivalent }: { hub: UsageHub; apiEquivalent: number }) {
  const { usd, alert_usd } = hub.billed;
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-4 py-3">
      <div className="flex justify-between gap-2 text-caption text-muted">
        <span>Billed this month</span>
        <span>Sazed API</span>
      </div>
      <span className="font-mono text-heading text-ink">${usd.toFixed(2)}</span>
      <Meter pct={alert_usd ? (usd / alert_usd) * 100 : 0} tone="bg-ink-2" />
      <span className="text-caption text-ink-2">
        {alert_usd ? `of the ${dollars(alert_usd)} spend alert` : "no spend alert set"} · API-equivalent {dollars(apiEquivalent)} in range
      </span>
    </div>
  );
}

function LimitsStrip({ hub, apiEquivalent }: { hub: UsageHub; apiEquivalent: number }) {
  const byWindow = new Map(hub.limits.map((l) => [l.window, l]));
  return (
    <section
      aria-label="Plan limits and billed spend"
      className="grid grid-cols-1 divide-y divide-line rounded-lg border border-line bg-surface md:grid-cols-3 md:divide-x md:divide-y-0"
    >
      {hub.limits.length === 0 ? (
        <div className="px-4 py-3 text-meta text-muted md:col-span-2">No plan readings yet. They arrive with the next Claude worker job.</div>
      ) : (
        <>
          <LimitCell limit={byWindow.get("five_hour")} />
          <LimitCell limit={byWindow.get("seven_day")} />
        </>
      )}
      <BilledCell hub={hub} apiEquivalent={apiEquivalent} />
    </section>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 0);
  const w = 160;
  const h = 24;
  const points = values
    .map((v, i) => `${(i * w) / Math.max(values.length - 1, 1)},${h - 2 - (max ? (v / max) * (h - 4) : 0)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-6 w-full" aria-hidden="true">
      <polyline points={points} fill="none" className="stroke-muted" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface SourceRowData {
  source: HubSource;
  total: string;
  values: number[];
}

function sourceRows(hub: UsageHub, days: string[], rows: HubDay[]): SourceRowData[] {
  const index = new Map(days.map((d, i) => [d, i]));
  return hub.sources.map((source) => {
    const mine = rows.filter((r) => r.source === source.source && r.machine === source.machine);
    const priced = source.source !== "worker_agy";
    const values = days.map(() => 0);
    let sum = 0;
    for (const r of mine) {
      const v = priced ? (r.usd ?? 0) : freshTokens(r);
      sum += v;
      const i = index.get(r.day);
      if (i !== undefined) values[i] += v;
    }
    return { source, values, total: priced ? dollars(sum) : `${tokens(sum)} tok` };
  });
}

function SourceRows({ hub, days, rows, onOpen }: { hub: UsageHub; days: string[]; rows: HubDay[]; onOpen: (tab: Tab) => void }) {
  const items = sourceRows(hub, days, rows);
  const limits = hub.limits;
  return (
    <section aria-label="Sources" className="rounded-lg border border-line bg-surface">
      <h2 className="border-b border-line px-4 py-2.5 text-meta text-muted">Sources</h2>
      <ul>
        {items.map(({ source, values, total }) => {
          const tone = feedTone(source);
          return (
            <li key={`${source.source}:${source.machine}`} className="border-t border-line first:border-t-0">
              <button
                type="button"
                onClick={() => onOpen(SOURCE_TAB[source.source] ?? "overview")}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 text-left hover:bg-raised md:grid-cols-[minmax(0,1.3fr)_minmax(80px,1fr)_96px_170px]"
              >
                <span className="min-w-0 truncate text-meta font-medium text-ink">{sourceLabel(source.source, source.machine)}</span>
                <span className="col-span-2 row-start-3 md:col-span-1 md:row-start-auto">
                  <Sparkline values={values} />
                </span>
                <span className="text-right font-mono text-meta text-ink">{total}</span>
                <span className={cn("col-span-2 inline-flex items-center gap-1.5 text-caption md:col-span-1", toneText[tone] === "text-muted" ? "text-ink-2" : toneText[tone])}>
                  <span className={cn("size-1.5 rounded-full", toneDot[tone])} aria-hidden="true" />
                  {feedVerb(source.source)} {ago(source.last_at)}
                </span>
              </button>
            </li>
          );
        })}
        {limits.length > 0 && (
          <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 md:grid-cols-[minmax(0,1.3fr)_minmax(80px,1fr)_96px_170px]">
            <span className="text-meta font-medium text-ink">Plan limits</span>
            <span className="col-span-2 row-start-3 md:col-span-1 md:row-start-auto">
              <Sparkline values={(limits[0].points ?? []).map((p) => p.used_pct)} />
            </span>
            <span className="text-right font-mono text-meta text-ink">{limits.map((l) => `${Math.round(l.used_pct)}%`).join(" / ")}</span>
            <span className="col-span-2 inline-flex items-center gap-1.5 text-caption text-ink-2 md:col-span-1">
              <span className="size-1.5 rounded-full bg-muted" aria-hidden="true" />
              reading {ago(limits[0].read_at)}
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}

interface OverviewProps {
  hub: UsageHub;
  machine: string | null;
  onOpen: (tab: Tab) => void;
}

export function Overview({ hub, machine, onOpen }: OverviewProps) {
  const [metric, setMetric] = useState<Metric>("api_equivalent");
  const [groupBy, setGroupBy] = useState<GroupBy>("source");
  const days = rangeDays(hub);
  const rows = machine ? hub.days.filter((d) => d.machine === machine) : hub.days;
  const apiEquivalent = hub.days.reduce((n, d) => n + (d.kind === "api_equivalent" ? (d.usd ?? 0) : 0), 0);

  return (
    <>
      <LimitsStrip hub={hub} apiEquivalent={apiEquivalent} />
      <section aria-label="Usage per day" className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-meta text-muted">{metric === "tokens" ? "Tokens per day, cache reads left out" : "Cost per day"}</h2>
          <div className="flex flex-wrap gap-2">
            <Segmented label="Measure" options={METRICS} value={metric} onChange={setMetric} />
            <Segmented label="Group by" options={GROUPS} value={groupBy} onChange={setGroupBy} />
          </div>
        </div>
        <CostChart days={days} rows={rows} metric={metric} groupBy={groupBy} />
        {hub.unpriced.length > 0 && (
          <p className="text-caption text-muted">
            No price for {hub.unpriced.map((u) => `${u.model} (${u.calls})`).join(", ")}; their tokens show under Tokens only.
          </p>
        )}
      </section>
      <SourceRows
        hub={machine ? { ...hub, sources: hub.sources.filter((s) => s.machine === machine) } : hub}
        days={days}
        rows={rows}
        onOpen={onOpen}
      />
    </>
  );
}
