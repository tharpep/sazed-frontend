import type { DispatchCardTask, DispatchRunView } from "@/api/dispatch";
import { rowState } from "@/features/plans/dispatchRun";

import { CardAnswer, CardFrame, CardHeader, MoreLine, Num } from "./card/frame";
import { consoleLink } from "./card/links";
import { CardActions, Callout, Dot, StepSquare, type StepMark } from "./card/marks";

const ROWS = 3;
// Past this many tasks the squares shrink and the rows cut to two, so a big plan stays under the
// host's height cap.
const BIG_PLAN = 24;
const BIG_PLAN_ROWS = 2;

type Group = "landed" | "landing" | "working" | "asking" | "failed" | "next" | "other";

const MARK: Record<Group, StepMark> = {
  landed: "done",
  landing: "landing",
  working: "flight",
  asking: "asking",
  failed: "blocked",
  next: "planned",
  other: "other",
};

const FAILED = new Set(["failed", "conflict", "blocked", "timed_out", "cancelled"]);

/** Where a task stands, by the console's rule: its phase, read through Sazed's run state where that says more. */
export function groupOf(task: DispatchCardTask): Group {
  const row = task.latest;
  if (!row) return "next";
  const word = rowState(row);
  if (word === "waiting" || row.state === "needs_input") return "asking";
  if (word === "running") return "working";
  if (word === "landed") return "landed";
  if (word === "done") return "landing";
  if (FAILED.has(word) || row.state === "cancelled") return "failed";
  return "other";
}

/** "t3" reads "3"; any other id reads as its place in the plan. */
function squareLabel(id: string, index: number): string {
  return /^t?(\d{1,3})$/.exec(id)?.[1] ?? String(index + 1);
}

/** "12s", "8m", "3h 50m", "2d". */
export function age(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86_400)}d`;
}

function lastHeard(view: DispatchRunView): number | null {
  const heard = view.last_heard_at
    ? Date.parse(view.last_heard_at)
    : Math.max(...view.tasks.map((t) => (t.latest?.received_at ? Date.parse(t.latest.received_at) : Number.NaN)).filter((n) => !Number.isNaN(n)));
  const now = view.now ? Date.parse(view.now) : Date.now();
  return Number.isFinite(heard) && Number.isFinite(now) ? (now - heard) / 1000 : null;
}

/** "Next: t6 after t3 and t4 land", or that it is ready; null when nothing is planned. */
export function nextLine(tasks: readonly DispatchCardTask[], groups: Map<string, Group>): string | null {
  const next = tasks.find((t) => groups.get(t.id) === "next");
  if (!next) return null;
  const waiting = next.depends_on.filter((d) => groups.get(d) !== "landed");
  if (!waiting.length) return `Next: ${next.id} is ready to start`;
  const names = waiting.length > 3 ? `${waiting.slice(0, 3).join(", ")} and ${waiting.length - 3} more` : waiting.join(", ").replace(/, ([^,]*)$/, " and $1");
  return `Next: ${next.id} after ${names} ${waiting.length === 1 ? "lands" : "land"}`;
}

function TaskRow({ task, group }: { task: DispatchCardTask; group: Group }) {
  const detail = task.step || task.latest?.line;
  return (
    <div className="flex min-w-0 items-center gap-2.5 border-t border-card-line py-1.5 first:border-t-0">
      <Dot tone={group === "failed" ? "err" : "info"} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">
          {task.id} · {task.goal}
        </span>
        {detail && <span className="block truncate font-mono text-caption text-card-ink-3">{detail}</span>}
      </span>
      {task.elapsed_s != null && <Num className="text-card-ink-3">{age(task.elapsed_s)}</Num>}
    </div>
  );
}

/** One dispatch run: how far it got, one square per task, what is asking, and what is working. */
export function DispatchRunWidget(view: DispatchRunView) {
  const { plan, repo, tasks, tasks_total, open_url } = view;
  const groups = new Map(tasks.map((t) => [t.id, groupOf(t)]));
  const count = (g: Group) => tasks.filter((t) => groups.get(t.id) === g).length;
  const asking = tasks.filter((t) => groups.get(t.id) === "asking");
  const rows = tasks.filter((t) => ["working", "failed"].includes(groups.get(t.id)!));
  const big = tasks.length > BIG_PLAN;
  const rowCap = big ? BIG_PLAN_ROWS : ROWS;
  const more = [
    asking.length > 1 && `${asking.length - 1} more asking`,
    rows.length > rowCap && `${rows.length - rowCap} more working or failed`,
  ]
    .filter(Boolean)
    .join(" · ");
  const heard = lastHeard(view);
  const unsent = Math.max(0, tasks_total - tasks.length);
  const next = nextLine(tasks, groups);
  const tail = [
    count("working") && `${count("working")} working`,
    asking.length && `${asking.length} asking`,
    count("failed") && `${count("failed")} failed`,
    count("landing") && `${count("landing")} landing`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <CardFrame>
      <CardHeader
        right={
          heard != null && (
            <>
              last heard <Num>{age(heard)}</Num>
            </>
          )
        }
      >
        Dispatch · {repo.split("/").pop()}
      </CardHeader>
      {tasks.length ? (
        <CardAnswer tail={tail || undefined}>
          {count("landed")} of {tasks_total} landed
        </CardAnswer>
      ) : (
        <CardAnswer tail={plan}>No tasks yet</CardAnswer>
      )}

      {tasks.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1">
          {tasks.map((t, i) => (
            <StepSquare key={t.id} small={big} mark={MARK[groups.get(t.id)!]} label={squareLabel(t.id, i)} title={`${t.id}: ${t.goal} (${t.latest ? rowState(t.latest).replace(/_/g, " ") : "not started"})`} />
          ))}
          {unsent > 0 && <span className="text-caption text-card-ink-3">+{unsent} more</span>}
          <span className="ml-1.5 min-w-0 truncate text-caption text-card-ink-3">{plan}</span>
        </div>
      )}

      {asking[0] && (
        <Callout>
          {asking[0].id} asks: {asking[0].question || asking[0].latest?.line || "it is waiting on you"}
        </Callout>
      )}

      {rows.length > 0 && (
        <div>
          {rows.slice(0, rowCap).map((t) => (
            <TaskRow key={t.id} task={t} group={groups.get(t.id)!} />
          ))}
        </div>
      )}
      {more && <MoreLine>+{more}</MoreLine>}
      {next && <MoreLine>{next}</MoreLine>}

      <CardActions links={open_url ? [consoleLink("Open in console", open_url)] : []} />
    </CardFrame>
  );
}
