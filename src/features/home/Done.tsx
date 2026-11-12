import type { CommandSummary } from "@/api/command";
import { cn } from "@/lib/utils";

import { Group, MoreLink } from "./Group";
import { goTo } from "./homeNav";
import { ago } from "./summary";

const DONE_ROWS = 3;

interface Props {
  done: CommandSummary["done"] | null;
  compact: boolean;
  onOpenJob: (jobId: string) => void;
}

/** What finished in the backend's window (24 hours); the phone keeps it to one line. */
export function Done({ done, compact, onOpenJob }: Props) {
  const total = done ? done.succeeded + done.failed : null;
  const runs = () => goTo({ hub: "agents", view: "runs" });
  const latest = done?.latest ?? [];
  const rows = latest.slice(0, DONE_ROWS);
  const hidden = (total ?? 0) - rows.length;
  return (
    <Group
      name="Done"
      count={total}
      empty="Nothing finished in the last day."
      extra={<span className="font-normal text-muted">last {done?.window_hours ?? 24} h</span>}
    >
      {compact ? (
        latest[0] && (
          <MoreLink onClick={runs} className="ml-[34px] max-sm:my-0">
            {latest[0].title}
            {total! > 1 ? ` and ${total! - 1} more in Runs` : ""}
          </MoreLink>
        )
      ) : (
        <>
          <ul>
            {rows.map((j) => (
              <li key={j.job_id}>
                <button
                  type="button"
                  onClick={() => onOpenJob(j.job_id)}
                  className="grid min-h-11 w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-3 py-1.5 text-left hover:bg-surface"
                >
                  <span
                    aria-hidden="true"
                    className={cn("text-center font-mono", j.status === "succeeded" ? "text-caption text-muted" : "text-[15px] text-err")}
                  >
                    {j.status === "succeeded" ? "·" : "!"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-body text-ink-2">{j.title}</span>
                    <span className="block truncate text-caption text-muted">
                      {[j.repo, j.status === "succeeded" ? null : j.status === "timed_out" ? "timed out" : "failed"]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="font-mono text-caption text-muted tabular-nums">{ago(j.finished_at)}</span>
                </button>
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <MoreLink onClick={runs} className="mt-0.5 ml-[46px]">
              {hidden} more in Runs
            </MoreLink>
          )}
        </>
      )}
    </Group>
  );
}
