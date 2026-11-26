import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Line, LineChart, YAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { SeriesPoint } from "./data";

/** ListSection's title is a plain label; these heads also carry a quiet count. */
export function SectionHead({ title, count, className }: { title: string; count?: number; className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-2 px-0.5", className)}>
      <h2 className="text-body font-medium text-ink">{title}</h2>
      {count !== undefined && <span className="font-mono text-meta text-muted">{count}</span>}
    </div>
  );
}

interface FoldProps {
  title: string;
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A secondary section, closed by default: its title and a count or total until opened. */
export function Fold({ title, summary, children, className }: FoldProps) {
  return (
    <Collapsible className={cn("flex-col overflow-hidden rounded-lg border border-line bg-surface", className)}>
      <CollapsibleTrigger className="group flex min-h-11 w-full items-center gap-2 px-3 text-left transition-colors hover:bg-raised/60 md:min-h-10 md:px-4">
        <span className="text-body font-medium text-ink">{title}</span>
        <span className="font-mono text-meta text-muted">{summary}</span>
        <ChevronDown className="ml-auto size-4 text-muted transition-transform group-data-[panel-open]:rotate-180" aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-line px-3 py-2 md:px-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/** Outlined amber ring: this row has something waiting in To check. */
export function CheckRing() {
  return <span className="block size-2.5 shrink-0 rounded-full border-[1.5px] border-warn" role="img" aria-label="Needs a check" />;
}

/** Dashed amber ring: this figure is older than its feed promises. */
export function StaleRing() {
  return (
    <span className="block size-2.5 shrink-0 rounded-full border-[1.5px] border-dashed border-warn" role="img" aria-label="Older than usual" />
  );
}

export function inDays(n: number): string {
  return n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
}

export function inDaysShort(n: number): string {
  return n === 0 ? "today" : `${n} d`;
}

const SPARK_CONFIG = { value: { label: "Balance", color: "var(--color-ink-2)" } } satisfies ChartConfig;

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
}

/** A Recharts dot renderer that draws only the last point. */
export function lastDot(lastIndex: number, r: number) {
  return function LastDot({ cx, cy, index }: DotProps) {
    if (index !== lastIndex || cx === undefined || cy === undefined) return <g key={index} />;
    return <circle key={index} cx={cx} cy={cy} r={r} fill="var(--color-ink)" />;
  };
}

/** A one-figure history draws as a dashed stub ending in a dot, so it does not look like a flat trend. */
export function Spark({ points, className }: { points: SeriesPoint[]; className?: string }) {
  const one = points.length === 1;
  const data = one ? [points[0], points[0]] : points;
  return (
    <ChartContainer
      config={SPARK_CONFIG}
      initialDimension={{ width: 32, height: 24 }}
      className={cn("aspect-auto h-6 w-8 shrink-0 md:w-30", className)}
      aria-hidden="true"
    >
      <LineChart data={data} margin={{ top: 3, right: 3, bottom: 3, left: 2 }}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line
          dataKey="value"
          type="linear"
          isAnimationActive={false}
          stroke={one ? "var(--color-line)" : "var(--color-value)"}
          strokeWidth={1.4}
          strokeDasharray={one ? "2 3" : undefined}
          dot={lastDot(data.length - 1, 2.4)}
          activeDot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
