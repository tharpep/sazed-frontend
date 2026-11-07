import { useState } from "react";

import type { HubDay, UsageHub } from "@/api/claudeUsage";
import { EmptyState, Segmented } from "@/components/system";
import { CostChart } from "./CostChart";
import { dollars, modelName, tokens } from "./format";
import { freshTokens, rangeDays, SOURCE_NAME, type Metric } from "./hub";

interface Row {
  key: string;
  source: string;
  model: string;
  calls: number;
  input: number;
  output: number;
  cacheRead: number;
  thinking: number;
  usd: number | null;
}

function byModel(rows: HubDay[]): Row[] {
  const out = new Map<string, Row>();
  for (const r of rows) {
    const key = `${r.source}:${r.model}`;
    const row = out.get(key) ?? {
      key,
      source: r.source,
      model: r.model ?? "unknown",
      calls: 0,
      input: 0,
      output: 0,
      cacheRead: 0,
      thinking: 0,
      usd: null,
    };
    row.calls += r.calls;
    row.input += r.input_tokens;
    row.output += r.output_tokens;
    row.cacheRead += r.cache_read_tokens;
    row.thinking += r.thinking_tokens;
    if (r.usd !== null) row.usd = (row.usd ?? 0) + r.usd;
    out.set(key, row);
  }
  return [...out.values()].sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0) || freshOf(b) - freshOf(a));
}

function freshOf(r: Row): number {
  return r.input + r.output + r.thinking;
}

interface Props {
  hub: UsageHub;
  sources: string[];
  metrics: { value: Metric; label: string }[];
  callsLabel: string;
  empty: string;
}

export function SourceTab({ hub, sources, metrics, callsLabel, empty }: Props) {
  const [metric, setMetric] = useState<Metric>(metrics[0].value);
  const rows = hub.days.filter((d) => sources.includes(d.source));
  if (rows.length === 0) return <EmptyState title={empty}>Nothing in this range.</EmptyState>;
  const table = byModel(rows);
  const total = rows.reduce((n, d) => n + freshTokens(d), 0);

  return (
    <>
      <section aria-label="Usage per day" className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-meta text-muted">
            {metric === "tokens" ? `Tokens per day, cache reads left out · ${tokens(total)} in range` : "Cost per day by model"}
          </h2>
          {metrics.length > 1 && <Segmented label="Measure" options={metrics} value={metric} onChange={setMetric} />}
        </div>
        <CostChart days={rangeDays(hub)} rows={rows} metric={metric} groupBy="model" />
      </section>
      <section aria-label="By model" className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-meta">
          <thead>
            <tr className="border-b border-line text-left text-caption text-muted">
              <th className="px-4 py-2 font-medium">Model</th>
              <th className="px-4 py-2 text-right font-medium">{callsLabel}</th>
              <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Input</th>
              <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Output</th>
              <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Cache read</th>
              <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Thinking</th>
              <th className="px-4 py-2 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {table.map((r) => (
              <tr key={r.key} className="border-t border-line first:border-t-0">
                <td className="px-4 py-2 font-sans text-ink">
                  {modelName(r.model)}
                  {sources.length > 1 && <span className="ml-2 text-caption text-muted">{SOURCE_NAME[r.source] ?? r.source}</span>}
                </td>
                <td className="px-4 py-2 text-right">{r.calls.toLocaleString()}</td>
                <td className="hidden px-4 py-2 text-right sm:table-cell">{tokens(r.input)}</td>
                <td className="hidden px-4 py-2 text-right sm:table-cell">{tokens(r.output)}</td>
                <td className="hidden px-4 py-2 text-right md:table-cell">{tokens(r.cacheRead)}</td>
                <td className="hidden px-4 py-2 text-right md:table-cell">{tokens(r.thinking)}</td>
                <td className="px-4 py-2 text-right">{r.usd === null ? "no price" : dollars(r.usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
