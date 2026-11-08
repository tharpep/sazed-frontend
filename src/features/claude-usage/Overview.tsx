import { useState } from "react";

import { savePlanPeriod, type HubDay, type HubLimit, type HubSource, type HubValue, type UsageHub } from "@/api/claudeUsage";
import { Segmented, toneDot, toneText, type Tone } from "@/components/system";
import { cn } from "@/lib/utils";
import { Card, stateText } from "./Card";
import { CostChart } from "./CostChart";
import { dollars, shortDate, tokens } from "./format";
import {
  ago,
  clock,
  feedTone,
  feedVerb,
  freshTokens,
  paceSentence,
  paceTone,
  rangeDays,
  READING_SOURCE,
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

function Meter({ pct, tone, mark, even }: { pct: number; tone: Tone; mark?: number | null; even?: number | null }) {
  return (
    <div className="relative h-2 rounded-full bg-raised">
      <div className={cn("absolute inset-y-0 left-0 rounded-full", FILL[tone])} style={{ width: `${Math.min(pct, 100)}%` }} />
      {even != null && (
        <div className="absolute -inset-y-0.5 w-0.5 rounded-full bg-ink opacity-55" style={{ left: `${Math.min(even, 100)}%` }} aria-hidden="true" />
      )}
      {mark != null && mark > pct && (
        <div
          className="absolute -inset-y-0.5 border-l-2 border-dashed border-ink-2"
          style={{ left: `calc(${Math.min(mark, 100)}% - 2px)` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function Cell({ label, aside, value, valueClass, meter, note, foot }: {
  label: string;
  aside?: string;
  value: React.ReactNode;
  valueClass: string;
  meter: React.ReactNode;
  note: React.ReactNode;
  foot?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-4 py-3">
      <div className="flex justify-between gap-2 text-caption text-muted">
        <span>{label}</span>
        {aside && <span className="text-right">{aside}</span>}
      </div>
      <span className={cn("font-mono text-[18px] leading-6 font-medium tabular-nums", valueClass)}>{value}</span>
      {meter}
      {note && <span className="text-caption text-ink-2">{note}</span>}
      {foot && <span className="text-caption text-muted">{foot}</span>}
    </div>
  );
}

function LimitCell({ limit }: { limit: HubLimit }) {
  const tone = windowTone(limit);
  const dot = paceTone(limit);
  const pace = paceSentence(limit);
  const from = READING_SOURCE[limit.source] ?? limit.source;
  return (
    <Cell
      label={WINDOW_NAME[limit.window]}
      aside={limit.resets_at ? `${limit.reset_since ? "reset" : "resets"} ${clock(limit.resets_at)}` : undefined}
      value={limit.reset_since ? "0%" : `${Math.round(limit.used_pct)}%`}
      valueClass={limit.reset_since ? "text-muted" : stateText(tone)}
      meter={
        <Meter
          pct={limit.reset_since ? 0 : limit.used_pct}
          tone={tone}
          even={limit.reset_since ? null : limit.even_pct}
          mark={limit.reset_since ? null : limit.projected_pct}
        />
      }
      note={
        pace && (
          <>
            {dot !== "neutral" && <span className={cn("mr-1.5 inline-block size-1.5 rounded-full align-[1px]", toneDot[dot])} aria-hidden="true" />}
            {pace}
          </>
        )
      }
      foot={`${limit.reset_since ? "Last read" : "Read"} ${ago(limit.read_at)} from ${from}`}
    />
  );
}

const FIELD = "w-full min-w-0 rounded-md border border-border bg-surface px-2 py-1 text-caption text-ink outline-none focus-visible:border-primary";

function PlanForm({ value, onSaved, onCancel }: { value: HubValue | null; onSaved: () => void; onCancel?: () => void }) {
  const [plan, setPlan] = useState(value?.plan ?? "Max");
  const [price, setPrice] = useState(String(value?.monthly_usd ?? 100));
  const [since, setSince] = useState(new Date().toLocaleDateString("en-CA"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    savePlanPeriod({ plan: plan.trim(), monthly_usd: Number(price), starts_on: since })
      .then(onSaved)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setSaving(false));
  };
  return (
    <form onSubmit={save} className="grid grid-cols-[1fr_72px_1.2fr] gap-1.5" aria-label="Claude plan">
      <input value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan name" required className={FIELD} />
      <input value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Dollars a month" type="number" min="0" step="any" required className={cn(FIELD, "font-mono")} />
      <input value={since} onChange={(e) => setSince(e.target.value)} aria-label="Since" type="date" required className={FIELD} />
      <div className="col-span-3 flex items-center gap-3">
        <button type="submit" disabled={saving} className="text-caption font-medium text-primary hover:underline disabled:opacity-50">
          {saving ? "Saving…" : "Save plan"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-caption text-muted hover:text-ink">
            Cancel
          </button>
        )}
        {error && <span role="alert" className="truncate text-caption text-err">{error}</span>}
      </div>
    </form>
  );
}

function rangeLabel(hub: UsageHub, since: string): string {
  if (since > hub.range.from.slice(0, 10)) return `since ${shortDate(`${since}T12:00:00`)}`;
  return `last ${Math.round((Date.parse(hub.range.to) - Date.parse(hub.range.from)) / 86_400_000)} days`;
}

function ValueCell({ hub, onPlanSaved }: { hub: UsageHub; onPlanSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const { value } = hub;
  const { usd, alert_usd } = hub.billed;
  const billed = `Sazed API billed $${usd.toFixed(2)} this month, ${alert_usd ? `of the ${dollars(alert_usd)} spend alert` : "no spend alert set"}`;
  const saved = () => {
    setEditing(false);
    onPlanSaved();
  };
  if (!value || editing) {
    return (
      <Cell
        label="Subscription value"
        aside={value ? `${value.plan}, ${dollars(value.monthly_usd)} a month` : undefined}
        value={value ? dollars(value.api_equivalent_usd) : "No plan set"}
        valueClass={value ? "text-ink" : "text-muted"}
        meter={<PlanForm value={value} onSaved={saved} onCancel={value ? () => setEditing(false) : undefined} />}
        note="A plan applies from the date you give; earlier days keep their own price."
        foot={billed}
      />
    );
  }
  const apiShare = value.api_equivalent_usd >= value.plan_usd ? 100 : (value.api_equivalent_usd / value.plan_usd) * 100;
  const planShare = value.plan_usd >= value.api_equivalent_usd ? 100 : (value.plan_usd / value.api_equivalent_usd) * 100;
  const fee = value.plan_usd >= 10 ? `$${Math.round(value.plan_usd).toLocaleString()}` : dollars(value.plan_usd);
  return (
    <Cell
      label={`Subscription value, ${rangeLabel(hub, value.since)}`}
      aside={`${value.plan}, ${dollars(value.monthly_usd)} a month`}
      value={
        <>
          {dollars(value.api_equivalent_usd)}
          <span className="ml-1.5 font-sans text-caption font-normal text-muted">at API list prices</span>
        </>
      }
      valueClass="text-ink"
      meter={
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-[64px_1fr] items-center gap-2">
            <span className="text-caption text-muted">API value</span>
            <div className="h-2 rounded-full bg-ink-2" style={{ width: `${Math.max(apiShare, 2)}%` }} />
          </div>
          <div className="grid grid-cols-[64px_1fr] items-center gap-2">
            <span className="text-caption text-muted">Plan fees</span>
            <div className="h-2 rounded-full bg-ink opacity-35" style={{ width: `${Math.max(planShare, 2)}%` }} />
          </div>
        </div>
      }
      note={
        value.multiple != null
          ? `Plans cost ${fee} over the same days, so the usage was worth ${value.multiple} times the fee.`
          : `Plans cost ${fee} over the same days.`
      }
      foot={
        <>
          {billed} ·{" "}
          <button type="button" onClick={() => setEditing(true)} className="text-primary hover:underline">
            Change plan
          </button>
        </>
      }
    />
  );
}

function LimitsStrip({ hub, onPlanSaved }: { hub: UsageHub; onPlanSaved: () => void }) {
  const windows = (["five_hour", "seven_day"] as const)
    .map((w) => hub.limits.find((l) => l.window === w))
    .filter((l): l is HubLimit => Boolean(l));
  return (
    <section
      aria-label="Plan limits and subscription value"
      className="grid grid-cols-1 divide-y divide-line rounded-[10px] border border-line bg-surface md:grid-cols-3 md:divide-x md:divide-y-0"
    >
      {windows.length === 0 ? (
        <div className="px-4 py-3 text-meta text-muted md:col-span-2">No plan readings yet. They arrive once Claude is used on any machine.</div>
      ) : (
        windows.map((l) => <LimitCell key={l.window} limit={l} />)
      )}
      <ValueCell hub={hub} onPlanSaved={onPlanSaved} />
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
              method="worker jobs, dispatch, homelab probe"
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
  onPlanSaved: () => void;
}

export function Overview({ hub, machine, onOpen, onPlanSaved }: OverviewProps) {
  const [metric, setMetric] = useState<Metric>("api_equivalent");
  const [groupBy, setGroupBy] = useState<GroupBy>("source");
  const days = rangeDays(hub);
  const rows = machine ? hub.days.filter((d) => d.machine === machine) : hub.days;
  const sources = machine ? hub.sources.filter((s) => s.machine === machine) : hub.sources;

  return (
    <>
      <LimitsStrip hub={hub} onPlanSaved={onPlanSaved} />
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
