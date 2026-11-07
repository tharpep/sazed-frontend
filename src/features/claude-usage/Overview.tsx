import { useState } from "react";

import type { HubDay, HubLimit, HubSource, UsageHub } from "@/api/claudeUsage";
import { Segmented, toneDot, toneText, type Tone } from "@/components/system";
import { cn } from "@/lib/utils";
import { Card, stateText } from "./Card";
import { CostChart } from "./CostChart";
import { dollars, shortTime, tokens } from "./format";
import {
  ago,
  feedTone,
  feedVerb,
  freshTokens,
  rangeDays,
  SOURCE_METHOD,
  SOURCE_TAB,
  sourceLabel,
  type GroupBy,
  type Metric,
  type Tab,
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
const FILL: Record<Tone, string> = { neutral: "bg-ink-2", accent: "bg-primary", ok: "bg-ink-2", warn: "bg-warn", err: "bg-err" };
const ROW = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 md:grid-cols-[minmax(150px,1.3fr)_minmax(80px,1fr)_96px_170px]";

function Meter({ pct, tone, mark }: { pct: number; tone: Tone; mark?: number | null }) {
  return (
    <div className="relative h-2 rounded-full bg-raised">
      <div className={cn("absolute inset-y-0 left-0 rounded-full", FILL[tone])} style={{ width: `${Math.min(pct, 100)}%` }} />
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

function Cell({ label, aside, value, valueClass, meter, note }: {
  label: string;
  aside?: string;
  value: string;
  valueClass: string;
  meter: React.ReactNode;
  note: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-4 py-3">
      <div className="flex justify-between gap-2 text-caption text-muted">
        <span>{label}</span>
        {aside && <span>{aside}</span>}
      </div>
      <span className={cn("font-mono text-[18px] leading-6 font-medium tabular-nums", valueClass)}>{value}</span>
      {meter}
      <span className="text-caption text-ink-2">{note}</span>
    </div>
  );
}

function resetLabel(iso: string): string {
  const soon = Date.parse(iso) - Date.now() < 86_400_000;
  const day = soon ? "" : `${new Date(iso).toLocaleDateString(undefined, { weekday: "short" })} `;
  return `${day}${shortTime(iso)}`;
}

function LimitCell({ limit }: { limit: HubLimit }) {
  const tone = windowTone(limit);
  const note = limit.reset_since
    ? `reset since the last reading ${ago(limit.read_at)}`
    : [
        limit.projected_pct != null ? `${Math.round(limit.projected_pct)}% by reset at this pace` : null,
        `reading ${ago(limit.read_at)}`,
      ]
        .filter(Boolean)
        .join(" · ");
  return (
    <Cell
      label={WINDOW_NAME[limit.window]}
      aside={limit.resets_at && !limit.reset_since ? `resets ${resetLabel(limit.resets_at)}` : undefined}
      value={`${Math.round(limit.used_pct)}%`}
      valueClass={limit.reset_since ? "text-muted" : stateText(tone)}
      meter={<Meter pct={limit.reset_since ? 0 : limit.used_pct} tone={tone} mark={limit.reset_since ? null : limit.projected_pct} />}
      note={note}
    />
  );
}

function LimitsStrip({ hub, apiEquivalent }: { hub: UsageHub; apiEquivalent: number }) {
  const { usd, alert_usd } = hub.billed;
  const windows = (["five_hour", "seven_day"] as const)
    .map((w) => hub.limits.find((l) => l.window === w))
    .filter((l): l is HubLimit => Boolean(l));
  return (
    <section
      aria-label="Plan limits and billed spend"
      className="grid grid-cols-1 divide-y divide-line rounded-[10px] border border-line bg-surface md:grid-cols-3 md:divide-x md:divide-y-0"
    >
      {windows.length === 0 ? (
        <div className="px-4 py-3 text-meta text-muted md:col-span-2">No plan readings yet. They arrive with the next Claude worker job.</div>
      ) : (
        windows.map((l) => <LimitCell key={l.window} limit={l} />)
      )}
      <Cell
        label="Billed this month"
        aside="Sazed API"
        value={`$${usd.toFixed(2)}`}
        valueClass="text-ink"
        meter={<Meter pct={alert_usd ? (usd / alert_usd) * 100 : 0} tone="neutral" />}
        note={`${alert_usd ? `of the ${dollars(alert_usd)} spend alert` : "no spend alert set"} · API-equivalent ${dollars(apiEquivalent)}`}
      />
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
      <polyline points={points} fill="none" className="stroke-ink-2" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function RowBody({ name, method, values, total, tone, fresh }: {
  name: string;
  method: string;
  values: number[];
  total: string;
  tone: Tone;
  fresh: string;
}) {
  return (
    <>
      <span className="min-w-0">
        <span className="block truncate text-meta font-medium text-ink">{name}</span>
        <span className="block truncate text-caption text-muted">{method}</span>
      </span>
      <span className="col-span-2 row-start-3 md:col-span-1 md:row-start-auto">
        <Sparkline values={values} />
      </span>
      <span className="col-start-2 row-start-1 text-right font-mono text-meta text-ink tabular-nums md:col-start-auto md:row-start-auto">
        {total}
      </span>
      <span className={cn("col-span-2 inline-flex items-center gap-1.5 text-caption whitespace-nowrap md:col-span-1", tone === "neutral" ? "text-ink-2" : toneText[tone])}>
        <span className={cn("size-[7px] rounded-full", toneDot[tone])} aria-hidden="true" />
        {fresh}
      </span>
    </>
  );
}

function sourceTotals(source: HubSource, days: string[], rows: HubDay[]): { values: number[]; total: string } {
  const index = new Map(days.map((d, i) => [d, i]));
  const priced = source.source !== "worker_agy";
  const values = days.map(() => 0);
  let sum = 0;
  for (const r of rows) {
    if (r.source !== source.source || r.machine !== source.machine) continue;
    const v = priced ? (r.usd ?? 0) : freshTokens(r);
    sum += v;
    const i = index.get(r.day);
    if (i !== undefined) values[i] += v;
  }
  return { values, total: priced ? dollars(sum) : `${tokens(sum)} tok` };
}

function Sources({ sources, limits, days, rows, onOpen }: {
  sources: HubSource[];
  limits: HubLimit[];
  days: string[];
  rows: HubDay[];
  onOpen: (tab: Tab) => void;
}) {
  return (
    <Card title="Sources" note="select a row for its tab">
      <ul className="divide-y divide-line">
        {sources.map((source) => {
          const { values, total } = sourceTotals(source, days, rows);
          return (
            <li key={`${source.source}:${source.machine}`}>
              <button
                type="button"
                onClick={() => onOpen(SOURCE_TAB[source.source] ?? "overview")}
                className={cn(ROW, "w-full text-left transition-colors hover:bg-raised/60")}
              >
                <RowBody
                  name={sourceLabel(source.source, source.machine)}
                  method={SOURCE_METHOD[source.source] ?? ""}
                  values={values}
                  total={total}
                  tone={feedTone(source)}
                  fresh={`${feedVerb(source.source)} ${ago(source.last_at)}`}
                />
              </button>
            </li>
          );
        })}
        {limits.length > 0 && (
          <li className={ROW}>
            <RowBody
              name="Plan limits"
              method="readings from Claude jobs"
              values={limits[0].points.map((p) => p.used_pct)}
              total={limits.map((l) => `${Math.round(l.used_pct)}%`).join(" / ")}
              tone="neutral"
              fresh={`reading ${ago(limits[0].read_at)}`}
            />
          </li>
        )}
      </ul>
    </Card>
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
  const sources = machine ? hub.sources.filter((s) => s.machine === machine) : hub.sources;
  const apiEquivalent = hub.days.reduce((n, d) => n + (d.kind === "api_equivalent" ? (d.usd ?? 0) : 0), 0);

  return (
    <>
      <LimitsStrip hub={hub} apiEquivalent={apiEquivalent} />
      <Card
        title={metric === "tokens" ? "Tokens per day" : "Cost per day"}
        actions={
          <>
            <Segmented label="Measure" options={METRICS} value={metric} onChange={setMetric} />
            <Segmented label="Group by" options={GROUPS} value={groupBy} onChange={setGroupBy} />
          </>
        }
      >
        <div className="flex flex-col gap-2 px-4 py-3">
          <CostChart days={days} rows={rows} metric={metric} groupBy={groupBy} />
          {metric === "tokens" && <p className="text-caption text-muted">Input, output, cache writes and thinking. Cache reads are left out.</p>}
          {hub.unpriced.length > 0 && (
            <p className="text-caption text-muted">
              No price for {hub.unpriced.map((u) => `${u.model} (${u.calls})`).join(", ")}; their tokens show under Tokens only.
            </p>
          )}
        </div>
      </Card>
      <Sources sources={sources} limits={hub.limits} days={days} rows={rows} onOpen={onOpen} />
    </>
  );
}
