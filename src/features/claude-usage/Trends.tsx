import type { UsageWeek } from "@/api/claudeUsage";
import { Card } from "./Card";
import { dollars, niceMax, weekLabel } from "./format";
import { useWidth } from "./useWidth";

const HEIGHT = 170;
const PAD = { top: 16, right: 8, bottom: 22, left: 40 };

interface Series {
  label: string;
  fill: string;
  swatch: string;
  values: number[];
}

interface ChartProps {
  title: string;
  weeks: string[];
  series: Series[];
  format?: (n: number) => string;
}

function BarChart({ title, weeks, series, format = String }: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const totals = weeks.map((_, i) => series.reduce((n, s) => n + s.values[i], 0));
  const yMax = niceMax(Math.max(...totals, 1));
  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / Math.max(weeks.length, 1);
  const barW = Math.min(36, band * 0.6);
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

  return (
    <Card
      title={title}
      note={
        series.length > 1 && (
          <span className="flex gap-3">
            {series.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5">
                <span className={`size-2 rounded-[2px] ${s.swatch}`} aria-hidden="true" />
                {s.label}
              </span>
            ))}
          </span>
        )
      }
    >
      <div ref={ref} className="w-full px-4 py-3">
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={title} className="block font-mono text-[10.5px]">
            {[0, yMax / 2, yMax].map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} className="stroke-line" />
                <text x={PAD.left - 6} y={y(t) + 3.5} textAnchor="end" className="fill-muted">
                  {format(t)}
                </text>
              </g>
            ))}
            {weeks.map((w, i) => {
              const cx = PAD.left + band * i + band / 2;
              let base = 0;
              return (
                <g key={w}>
                  {series.map((s) => {
                    const top = y(base + s.values[i]);
                    const bottom = y(base);
                    base += s.values[i];
                    return <rect key={s.label} x={cx - barW / 2} y={top} width={barW} height={Math.max(bottom - top, 0)} className={s.fill} />;
                  })}
                  <text x={cx} y={y(totals[i]) - 4} textAnchor="middle" className="fill-ink">
                    {format(totals[i])}
                  </text>
                  <text x={cx} y={HEIGHT - 6} textAnchor="middle" className="fill-muted">
                    {weekLabel(w)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </Card>
  );
}

export function Trends({ weekly }: { weekly: UsageWeek[] }) {
  const weeks = weekly.map((w) => w.week);
  return (
    <section aria-label="Weekly trends" className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <BarChart
        title="Spend per week"
        weeks={weeks}
        format={dollars}
        series={[
          { label: "Main thread", fill: "fill-ink", swatch: "bg-ink", values: weekly.map((w) => w.main_cost_usd) },
          { label: "Subagents", fill: "fill-ink-2", swatch: "bg-ink-2", values: weekly.map((w) => w.subagent_cost_usd) },
          { label: "Side calls", fill: "fill-muted", swatch: "bg-muted", values: weekly.map((w) => w.side_cost_usd) },
          { label: "Sazed", fill: "fill-primary", swatch: "bg-primary", values: weekly.map((w) => w.sazed_cost_usd) },
        ]}
      />
      <BarChart
        title="Cost per prompt"
        weeks={weeks}
        format={dollars}
        series={[{ label: "Per prompt", fill: "fill-primary", swatch: "bg-primary", values: weekly.map((w) => w.cost_per_prompt_usd ?? 0) }]}
      />
      <BarChart
        title="Prompts per week"
        weeks={weeks}
        series={[{ label: "Prompts", fill: "fill-primary", swatch: "bg-primary", values: weekly.map((w) => w.prompts) }]}
      />
      <BarChart
        title="File writes per week"
        weeks={weeks}
        series={[
          { label: "Bash", fill: "fill-ink-2", swatch: "bg-ink-2", values: weekly.map((w) => w.bash_writes) },
          { label: "Edit", fill: "fill-primary", swatch: "bg-primary", values: weekly.map((w) => w.edit_writes) },
        ]}
      />
    </section>
  );
}
