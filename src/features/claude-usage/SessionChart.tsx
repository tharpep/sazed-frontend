import type { UsageLimits, UsageSession } from "@/api/claudeUsage";
import { shortDate, shortTime, tokens } from "./format";
import { useWidth } from "./useWidth";

const HEIGHT = 190;
const PAD = { top: 12, right: 14, bottom: 26, left: 46 };

export function SessionChart({ session, limits }: { session: UsageSession; limits: UsageLimits }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { context_soft: soft, context_hard: hard } = limits;
  const series = session.context_series;
  const t0 = Date.parse(series[0]?.ts ?? session.first_ts);
  const t1 = Date.parse(series[series.length - 1]?.ts ?? session.last_ts);
  const yMax = Math.max(session.peak_context, hard) * 1.08;
  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (iso: string) => PAD.left + (t1 === t0 ? 0 : ((Date.parse(iso) - t0) / (t1 - t0)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;
  const path = series.map((p, i) => `${i ? "L" : "M"}${x(p.ts).toFixed(1)},${y(p.context).toFixed(1)}`).join(" ");
  const sameDay = shortDate(series[0]?.ts ?? session.first_ts) === shortDate(series[series.length - 1]?.ts ?? session.last_ts);
  const label = (iso: string) => (sameDay ? shortTime(iso) : shortDate(iso));
  const mid = new Date((t0 + t1) / 2).toISOString();

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Context over time, peak ${tokens(session.peak_context)}`}
          className="block font-mono text-[10.5px]"
        >
          <line x1={PAD.left} x2={PAD.left + plotW} y1={y(0)} y2={y(0)} className="stroke-line" />
          {[
            { value: soft, name: "soft", stroke: "stroke-warn" },
            { value: hard, name: "hard", stroke: "stroke-err" },
          ].map((l) => (
            <g key={l.name}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(l.value)} y2={y(l.value)} strokeDasharray="4 3" className={l.stroke} />
              <text x={PAD.left - 6} y={y(l.value) + 3.5} textAnchor="end" className="fill-muted">
                {tokens(l.value)}
              </text>
            </g>
          ))}
          <text x={PAD.left - 6} y={y(0) + 3.5} textAnchor="end" className="fill-muted">
            0
          </text>
          {session.peak_context !== soft && session.peak_context !== hard && (
            <text x={PAD.left - 6} y={y(session.peak_context) + 3.5} textAnchor="end" className="fill-ink">
              {tokens(session.peak_context)}
            </text>
          )}
          <path d={path} fill="none" strokeWidth={1.75} strokeLinejoin="round" className="stroke-primary" />
          {session.confused_prompts.map((c) => (
            <circle key={c.ts} cx={x(c.ts)} cy={y(c.context)} r={3.5} className="fill-err stroke-bg" strokeWidth={1.5}>
              <title>{`Confused prompt at ${tokens(c.context)} context`}</title>
            </circle>
          ))}
          <text x={PAD.left} y={HEIGHT - 6} textAnchor="start" className="fill-muted">
            {label(series[0]?.ts ?? session.first_ts)}
          </text>
          <text x={PAD.left + plotW / 2} y={HEIGHT - 6} textAnchor="middle" className="fill-muted">
            {label(mid)}
          </text>
          <text x={PAD.left + plotW} y={HEIGHT - 6} textAnchor="end" className="fill-muted">
            {label(series[series.length - 1]?.ts ?? session.last_ts)}
          </text>
        </svg>
      )}
    </div>
  );
}
