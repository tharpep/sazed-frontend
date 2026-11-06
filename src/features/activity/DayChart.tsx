import type { ActivityEvent, ActivitySummary } from "@/api/activity";
import { cn } from "@/lib/utils";
import { usd } from "./format";

const HOUR = 3_600_000;

interface Bucket {
  start: number;
  count: number;
  errors: number;
}

/** 24 hourly buckets ending with the current hour. */
function buckets(events: ActivityEvent[], now: number): Bucket[] {
  const currentHour = Math.floor(now / HOUR) * HOUR;
  const first = currentHour - 23 * HOUR;
  const out: Bucket[] = Array.from({ length: 24 }, (_, i) => ({ start: first + i * HOUR, count: 0, errors: 0 }));
  for (const e of events) {
    const i = Math.floor((Date.parse(e.at) - first) / HOUR);
    if (i < 0 || i > 23) continue;
    out[i].count += 1;
    if (e.status === "error") out[i].errors += 1;
  }
  return out;
}

const hourLabel = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric" });
const plural = (n: number, word: string) => `${word}${n === 1 ? "" : "s"}`;

/** Last 24 hours at a glance: the totals in one line, then events per hour with errors in red. */
export function DayChart({ events, summary }: { events: ActivityEvent[]; summary: ActivitySummary["last_24h"] }) {
  const data = buckets(events, Date.now());
  const max = Math.max(1, ...data.map((b) => b.count));
  const total = data.reduce((n, b) => n + b.count, 0);
  const figures: [string, string, boolean?][] = [
    [String(summary.chat_messages), plural(summary.chat_messages, "message")],
    [String(summary.llm_calls), plural(summary.llm_calls, "model call")],
    [usd(summary.cost_usd), ""],
    [String(summary.tool_calls), plural(summary.tool_calls, "tool call")],
    [String(summary.jobs), plural(summary.jobs, "job")],
    [String(summary.errors), plural(summary.errors, "error"), summary.errors > 0],
  ];

  return (
    <section aria-label="Last 24 hours" className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-3">
      <p className="flex flex-wrap gap-x-3.5 gap-y-1 text-meta text-muted">
        {figures.map(([value, word, bad]) => (
          <span key={word || value} className={cn(bad && "text-err")}>
            <span className={cn("mr-1 font-mono font-medium", bad ? "text-err" : "text-ink")}>{value}</span>
            {word}
          </span>
        ))}
      </p>
      <div
        role="img"
        aria-label={`${total} events in the last 24 hours, busiest hour ${max} events`}
        className="grid h-10 grid-cols-24 items-end gap-[3px]"
      >
        {data.map((b) => {
          const height = b.count ? Math.max(8, Math.round((b.count / max) * 100)) : 7;
          // Errors fill the bottom of the bar in proportion, never thinner than a visible sliver.
          const errShare = b.errors ? Math.max(15, Math.round((b.errors / b.count) * 100)) : 0;
          return (
            <i
              key={b.start}
              title={`${hourLabel(b.start)}: ${b.count} events${b.errors ? `, ${b.errors} errors` : ""}`}
              className={cn("block rounded-[2px]", b.count ? "bg-muted" : "bg-line")}
              style={{
                height: `${height}%`,
                ...(errShare
                  ? { background: `linear-gradient(to top, var(--color-err) 0 ${errShare}%, var(--color-muted) ${errShare}% 100%)` }
                  : {}),
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[10.5px] text-muted" aria-hidden="true">
        {[0, 6, 12, 18].map((i) => (
          <span key={i}>{hourLabel(data[i].start)}</span>
        ))}
        <span>Now</span>
      </div>
    </section>
  );
}
