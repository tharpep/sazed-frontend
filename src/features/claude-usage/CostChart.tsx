import type { HubDay } from "@/api/claudeUsage";
import { dollars, niceMax, shortDate, tokens } from "./format";
import { buildSeries, type GroupBy, type Metric } from "./hub";
import { useWidth } from "./useWidth";

const HEIGHT = 200;
const PAD = { top: 12, right: 4, bottom: 22, left: 44 };
const NARROW = 520;
const NARROW_DAYS = 14;
const RAMP = [
  { fill: "fill-ink", swatch: "bg-ink" },
  { fill: "fill-ink-2", swatch: "bg-ink-2" },
  { fill: "fill-muted", swatch: "bg-muted" },
  { fill: "fill-line", swatch: "bg-line" },
];
const BILLED = { fill: "fill-primary", swatch: "bg-primary" };

interface Props {
  days: string[];
  rows: HubDay[];
  metric: Metric;
  groupBy: GroupBy;
}

export function CostChart({ days: allDays, rows, metric, groupBy }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const days = width > 0 && width < NARROW ? allDays.slice(-NARROW_DAYS) : allDays;
  const series = buildSeries(days, rows, metric, groupBy);
  const format = metric === "tokens" ? tokens : dollars;
  const totals = days.map((_, i) => series.reduce((n, s) => n + s.values[i], 0));
  const yMax = niceMax(Math.max(...totals, metric === "tokens" ? 1 : 0.01));
  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / Math.max(days.length, 1);
  const barW = Math.max(Math.min(24, band * 0.7), 1);
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;
  const step = Math.max(1, Math.ceil(days.length / Math.max(Math.floor(plotW / 64), 1)));
  const colors = series.map((s, i) =>
    groupBy === "source" && s.key === "Sazed API" ? BILLED : RAMP[Math.min(i, RAMP.length - 1)]
  );

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {series.length > 0 && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted">
          {series.map((s, i) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className={`size-2 rounded-[2px] ${colors[i].swatch}`} aria-hidden="true" />
              {s.key}
              <span className="font-mono text-ink-2">{format(s.total)}</span>
            </span>
          ))}
        </p>
      )}
      <div ref={ref} className="w-full">
        {width > 0 && series.length === 0 && (
          <p className="py-10 text-center text-meta text-muted">Nothing in this range.</p>
        )}
        {width > 0 && series.length > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label="Usage per day" className="block font-mono text-[10.5px]">
            {[0, yMax / 2, yMax].map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} className="stroke-line" />
                <text x={PAD.left - 6} y={y(t) + 3.5} textAnchor="end" className="fill-muted">
                  {format(t)}
                </text>
              </g>
            ))}
            {days.map((day, i) => {
              const cx = PAD.left + band * i + band / 2;
              let base = 0;
              const last = i === days.length - 1;
              const label = last || (i % step === 0 && days.length - 1 - i >= step / 2);
              return (
                <g key={day}>
                  <title>{`${shortDate(`${day}T12:00:00`)}: ${format(totals[i])}`}</title>
                  {series.map((s, k) => {
                    const top = y(base + s.values[i]);
                    const bottom = y(base);
                    base += s.values[i];
                    if (bottom - top <= 0) return null;
                    return (
                      <rect
                        key={s.key}
                        x={cx - barW / 2}
                        y={top}
                        width={barW}
                        height={Math.max(bottom - top, 1)}
                        className={colors[k].fill}
                      />
                    );
                  })}
                  {label && (
                    <text
                      x={last ? PAD.left + plotW : cx}
                      y={HEIGHT - 6}
                      textAnchor={last ? "end" : "middle"}
                      className="fill-muted"
                    >
                      {shortDate(`${day}T12:00:00`)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
