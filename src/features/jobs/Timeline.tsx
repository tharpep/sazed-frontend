import type { TimelineStep } from "@/api/jobs";
import { StepIcon } from "@/features/home/StepLine";
import { clock, stepParts } from "@/features/home/steps";
import { cn } from "@/lib/utils";

export function Timeline({ steps, endAt, live }: { steps: TimelineStep[]; endAt: string | null; live: boolean }) {
  const times = steps.map((s) => Date.parse(s.at));
  const start = times[0];
  const end = endAt ? Date.parse(endAt) : Date.now();
  const span = Math.max(1, end - start);
  return (
    <section aria-label="Timeline" className="flex flex-col gap-1">
      <h3 className="text-sm font-medium text-ink">Timeline ({steps.length} steps)</h3>
      <ol className="flex flex-col">
        {steps.map((s, i) => {
          const { kind, detail } = stepParts(s.text);
          const from = times[i];
          const to = i + 1 < times.length ? times[i + 1] : end;
          const open = live && i === steps.length - 1;
          return (
            <li key={i} className="grid grid-cols-[minmax(0,1fr)_7rem_2.75rem] items-center gap-2 py-0.5" title={s.text}>
              <span className="flex min-w-0 items-center gap-1.5 font-mono text-caption text-ink">
                <StepIcon kind={kind} />
                <span className="truncate">{detail}</span>
              </span>
              <span className="relative h-1.5">
                <span
                  className={cn("absolute top-0 h-1.5 rounded-full bg-primary/70", open && "animate-pulse")}
                  style={{ left: `${((from - start) / span) * 100}%`, width: `${Math.max(2, ((to - from) / span) * 100)}%` }}
                />
              </span>
              <span className="text-right font-mono text-caption text-muted tabular-nums">
                {open ? "now" : clock(Math.max(0, Math.round((to - from) / 1000)))}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
