import { Area, AreaChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { ALL_ACCOUNTS, netWorth, netWorthSeries, type FinanceState, type NetWorthPoint } from "./data";
import { Amount, useMask } from "./Masked";
import { lastDot, Spark } from "./parts";

const CONFIG = { value: { label: "Net worth", color: "var(--color-ink-2)" } } satisfies ChartConfig;

interface JoinLabelProps {
  viewBox?: { x?: number; y?: number };
  text: string;
  row: number;
}

/** Labels for neighbouring markers are stacked so they don't overlap. */
function JoinLabel({ viewBox, text, row }: JoinLabelProps) {
  return (
    <text x={(viewBox?.x ?? 0) + 4} y={(viewBox?.y ?? 0) + 10 + row * 14} className="fill-muted font-mono text-caption">
      {text}
    </text>
  );
}

function SeriesArea({ data, wide }: { data: NetWorthPoint[]; wide: boolean }) {
  const { masked } = useMask();
  const values = data.map((p) => p.value);
  const hi = Math.max(...values);
  const joins = data.filter((p) => p.joined);
  return (
    <AreaChart data={data} margin={wide ? { top: 18, right: 4, bottom: 0, left: 4 } : { top: 4, right: 4, bottom: 4, left: 2 }}>
      <XAxis
        dataKey="date"
        hide={!wide}
        ticks={[data[0].date, data[data.length - 1].date]}
        interval={0}
        tickLine={false}
        axisLine={{ stroke: "var(--color-line)" }}
        className="font-mono"
      />
      <YAxis
        orientation="right"
        hide={!wide || masked}
        domain={["dataMin", "dataMax"]}
        ticks={[hi]}
        tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
        tickLine={false}
        axisLine={false}
        width={32}
        className="font-mono"
      />
      {wide &&
        joins.map((p, row) => (
          <ReferenceLine
            key={p.date}
            x={p.date}
            stroke="var(--color-muted)"
            strokeDasharray="3 3"
            label={<JoinLabel text={p.joined ?? ""} row={row} />}
          />
        ))}
      <Area
        dataKey="value"
        type="linear"
        isAnimationActive={false}
        stroke="var(--color-value)"
        strokeWidth={1.6}
        fill="var(--color-raised)"
        fillOpacity={0.6}
        dot={lastDot(data.length - 1, 3)}
        activeDot={false}
      />
    </AreaChart>
  );
}

export function NetWorth({ state }: { state: FinanceState }) {
  const series = netWorthSeries(state);
  const counted = state.accounts.filter((a) => a.figure);
  const ages = counted.map((a) => a.figure?.ageDays ?? 0);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const net = netWorth(state.accounts);
  const allFrom = series.findIndex((p) => p.accounts === ALL_ACCOUNTS);
  const sinceAll = allFrom >= 0 && allFrom < series.length - 1 ? series[allFrom] : null;
  const missing = state.accounts.filter((a) => !a.figure);
  const change = sinceAll ? net - sinceAll.value : 0;

  return (
    <section className="flex flex-col gap-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-end gap-3 md:block">
        <div className="flex flex-col gap-0.5">
          <span className="text-meta text-muted">Net worth</span>
          <Amount value={net} sign className="self-start text-heading font-medium text-ink" />
          <p className="text-meta text-ink-2">
            {missing.length
              ? `${counted.length} of ${ALL_ACCOUNTS} accounts · ${missing.length} without a figure`
              : `${ALL_ACCOUNTS} accounts · ${minAge === 0 ? "today" : `${minAge} d`} to ${maxAge} d old`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 md:hidden">
          {sinceAll ? (
            <ChartContainer config={CONFIG} initialDimension={{ width: 120, height: 48 }} className="aspect-auto h-12 w-30" aria-hidden="true">
              <SeriesArea data={series.slice(allFrom)} wide={false} />
            </ChartContainer>
          ) : (
            <Spark points={series} className="h-12 w-30" />
          )}
          <span className="text-caption text-muted">{sinceAll ? `since ${sinceAll.date}` : "one figure"}</span>
        </div>
      </div>

      <div className="hidden md:block">
        {series.length > 1 ? (
          <ChartContainer
            config={CONFIG}
            initialDimension={{ width: 560, height: 180 }}
            className="aspect-auto h-45 w-full"
            role="img"
            aria-label="Net worth over time"
          >
            <SeriesArea data={series} wide />
          </ChartContainer>
        ) : (
          <div className="flex h-32 items-center gap-2.5 border-b border-line text-caption text-muted">
            <span className="size-2 shrink-0 rounded-full bg-ink" aria-hidden="true" />
            <span>{series[0].date}: first figure</span>
          </div>
        )}
        {sinceAll && (
          <p className="pt-1 text-caption text-muted">
            {change >= 0 ? "Up" : "Down"} <Amount value={Math.abs(change)} className="text-caption" /> since {sinceAll.date}
          </p>
        )}
      </div>
    </section>
  );
}
