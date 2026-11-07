import type { DispatchTask } from "@/api/dispatch";
import { toneDot, toneText } from "@/components/system";
import { cn } from "@/lib/utils";
import { StateLabel } from "./DispatchCards";
import { at, last, clock, costOf, dollars, runRows, STATE_TONE, stateOf } from "./dispatchRun";
import { useNow } from "./useNow";

export function DispatchPanel({ task }: { task: DispatchTask }) {
  const rows = runRows(task);
  const state = stateOf(task);
  const open = last(rows)?.state === "running";
  const now = useNow(open);
  const start = rows.length ? at(rows[0]) : now;
  const end = open ? now : rows.length ? at(rows[rows.length - 1]) : now;
  const span = Math.max(end - start, 1000);

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
        <h2 className="min-w-0 truncate font-mono text-body font-semibold text-ink">{task.id}</h2>
        <StateLabel state={state} />
      </div>
      <p className="border-b border-line px-3.5 py-2.5 text-meta text-ink-2">{task.goal}</p>
      <dl className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-2.5 gap-y-1 border-b border-line px-3.5 py-2.5 text-caption">
        <dt className="text-muted">Runs on</dt>
        <dd>
          {task.profile} · {task.model}
        </dd>
        <dt className="text-muted">Owns</dt>
        <dd className="font-mono [overflow-wrap:anywhere]">
          {task.owns.map((o) => (
            <div key={o}>{o}</div>
          ))}
        </dd>
        <dt className="text-muted">After</dt>
        <dd>{task.depends_on.join(", ") || "nothing"}</dd>
        <dt className="text-muted">Cost</dt>
        <dd>{dollars(costOf(task))}</dd>
      </dl>
      <div className="px-3.5 py-2.5">
        <h3 className="mb-2 text-caption text-muted">Rows</h3>
        {rows.length === 0 && <p className="text-caption text-muted">No rows yet.</p>}
        {rows.map((r, i) => {
          const from = at(r);
          const to = i + 1 < rows.length ? at(rows[i + 1]) : end;
          const live = i === rows.length - 1 && r.state === "running";
          return (
            <div key={`${r.ts}-${i}`} className="py-1">
              <div className="grid grid-cols-[4rem_minmax(0,1fr)_2.5rem] items-center gap-2 font-mono text-caption">
                <span className={cn("truncate", toneText[STATE_TONE[r.state]])}>
                  {r.state}
                </span>
                <span className="relative h-1.5 rounded-sm bg-raised">
                  <i
                    className={cn("absolute top-0 h-1.5 rounded-sm", toneDot[STATE_TONE[r.state]], live && "animate-pulse")}
                    style={{
                      left: `${(100 * (from - start)) / span}%`,
                      width: `${Math.max(1.5, (100 * (to - from)) / span)}%`,
                    }}
                  />
                </span>
                <span className="text-right text-muted">{live ? "now" : clock((to - from) / 1000)}</span>
              </div>
              <p className="pt-0.5 pl-[4.5rem] text-caption text-ink-2 [overflow-wrap:anywhere]">{r.line}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-auto border-t border-line px-3.5 py-2.5 text-caption text-muted">
        Agent tool calls aren't mirrored yet, so this shows the task's rows.
      </p>
    </section>
  );
}
