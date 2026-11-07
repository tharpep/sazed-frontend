import type { DispatchTask } from "@/api/dispatch";
import { toneDot, toneText } from "@/components/system";
import { cn } from "@/lib/utils";
import { at, last, clock, costOf, dollars, runRows, STATE_TONE, stateOf, tries, type TaskState } from "./dispatchRun";
import { useNow } from "./useNow";

export function StateLabel({ state, since }: { state: TaskState; since?: number }) {
  const now = useNow(state === "running");
  const text =
    state === "running" ? (
      <>
        <span className="animate-pulse">running</span>
        {since ? ` · ${clock((now - since) / 1000)}` : ""}
      </>
    ) : state === "waiting" ? (
      "asking you"
    ) : state === "next" ? (
      "not started"
    ) : (
      state
    );
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-caption whitespace-nowrap", toneText[STATE_TONE[state]])}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", toneDot[STATE_TONE[state]])} />
      <span>{text}</span>
    </span>
  );
}

interface CardProps {
  task: DispatchTask;
  byId: Map<string, DispatchTask>;
  selected: boolean;
  fresh: boolean;
  onSelect: (id: string) => void;
}

export function TaskCard({ task, byId, selected, fresh, onSelect }: CardProps) {
  const state = stateOf(task);
  const rows = runRows(task);
  const latest = last(rows);
  const running = last(rows.filter((r) => r.state === "running"));
  const attempts = tries(task);
  const frame = cn(
    "w-full min-w-0 rounded-lg border bg-surface px-2.5 py-2 text-left transition-colors hover:border-ink-2/40",
    selected ? "border-primary ring-2 ring-primary/20" : "border-line",
    state === "next" && "border-dashed bg-transparent",
    state === "running" && "border-l-2 border-l-primary",
    state === "waiting" && !selected && "border-warn/50",
    (state === "failed" || state === "conflict" || state === "blocked") && !selected && "border-err/50",
    fresh && "animate-in fade-in slide-in-from-bottom-1.5 duration-500"
  );
  if (state === "next") {
    const left = task.depends_on.filter((d) => {
      const dep = byId.get(d);
      return !dep || stateOf(dep) !== "landed";
    });
    return (
      <button type="button" data-node={`t:${task.id}`} onClick={() => onSelect(task.id)} className={frame}>
        <span className="flex items-center gap-2">
          <span className="min-w-0 truncate font-mono text-meta font-medium text-ink">{task.id}</span>
          <span className="ml-auto shrink-0 text-caption text-muted">{task.profile}</span>
        </span>
        <span className="mt-0.5 block truncate text-caption text-muted">
          {left.length ? `after ${left.join(", ")}` : <span className="text-primary">ready, starts next</span>}
        </span>
      </button>
    );
  }
  return (
    <button type="button" data-node={`t:${task.id}`} onClick={() => onSelect(task.id)} className={frame}>
      <span className="flex items-center gap-2">
        <span className="min-w-0 truncate font-mono text-meta font-medium text-ink">{task.id}</span>
        <span className="ml-auto shrink-0">
          <StateLabel state={state} since={running ? at(running) : undefined} />
        </span>
      </span>
      <span className="mt-0.5 block truncate text-caption text-muted">
        {task.profile} · {task.model}
        {attempts > 1 ? ` · try ${attempts}` : ""}
      </span>
      {latest && state !== "running" && (
        <span className="mt-1.5 line-clamp-2 block text-caption text-ink-2">{latest.line}</span>
      )}
    </button>
  );
}

export function MiniRow({ task, selected, onSelect }: Pick<CardProps, "task" | "selected" | "onSelect">) {
  return (
    <button
      type="button"
      data-node={`t:${task.id}`}
      onClick={() => onSelect(task.id)}
      className={cn(
        "flex w-full justify-between gap-2 border-b border-line px-0.5 py-1.5 text-left font-mono text-caption last:border-b-0 hover:bg-raised/60",
        selected && "text-primary"
      )}
    >
      <span className="min-w-0 truncate">{task.id}</span>
      <span className="shrink-0 text-muted">{dollars(costOf(task))}</span>
    </button>
  );
}

export function SystemBox({ node, title, mono, tag, children }: { node?: string; title: string; mono?: boolean; tag?: boolean; children: string }) {
  return (
    <div data-node={node} className="rounded-lg border border-line px-2.5 py-2 text-caption text-ink-2">
      <div className={cn("flex items-center gap-1.5 font-medium text-ink", mono && "font-mono")}>
        {title}
        {tag && <span className="animate-pulse font-mono text-caption font-normal text-primary">landing</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}
