import type { ActivityEvent, ActivityStatus } from "@/api/activity";
import type { Project } from "@/api/projects";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";

const ACTIVITY_DOT: Record<ActivityStatus, string> = {
  ok: "bg-ok",
  error: "bg-err",
  running: "bg-primary",
  pending: "bg-accent",
  info: "bg-muted",
};

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
}

const panel = "overflow-hidden rounded-lg border border-line bg-surface";
const heading = "flex items-baseline gap-1.5 border-b border-line px-3.5 py-2.5 text-meta font-semibold text-ink";

export function ProjectsInFlight({ projects }: { projects: Project[] | null }) {
  const ui = useUiStore();
  function open(slug: string) {
    ui.setLinkedProject(slug);
    ui.toggleProjects();
  }
  return (
    <section aria-label="Projects in flight" className={panel}>
      <h2 className={heading}>
        Projects in flight <span className="font-normal text-muted">from the board</span>
      </h2>
      {projects && projects.length === 0 && <p className="px-3.5 py-3 text-meta text-muted">No active projects.</p>}
      <ul className="divide-y divide-line">
        {(projects ?? []).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => open(p.slug)}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-raised/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-ink">{p.title}</span>
                <span className="block truncate text-caption text-muted">{p.current?.title ?? "No open step"}</span>
              </span>
              <span aria-hidden="true" className="flex h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-raised">
                <span className="h-full bg-ok" style={{ width: `${p.bar.done * 100}%` }} />
                <span className="h-full bg-primary" style={{ width: `${p.bar.in_flight * 100}%` }} />
                <span className="h-full bg-accent" style={{ width: `${p.bar.needs_me * 100}%` }} />
              </span>
              <span className="shrink-0 text-right font-mono text-caption whitespace-nowrap text-muted tabular-nums">
                {p.steps_done}/{p.steps_total}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecentActivity({ events }: { events: ActivityEvent[] | null }) {
  const toggleAudit = useUiStore((s) => s.toggleAudit);
  return (
    <section aria-label="Activity" className={panel}>
      <h2 className={heading}>
        Activity
        <button type="button" onClick={toggleAudit} className="ml-auto text-caption font-normal text-primary hover:underline">
          All activity
        </button>
      </h2>
      <ul className="flex flex-col py-1.5">
        {(events ?? []).map((e) => (
          <li key={e.id} className="flex items-baseline gap-2.5 px-3.5 py-1 text-meta">
            <time className="shrink-0 font-mono text-caption text-muted tabular-nums">{time(e.at)}</time>
            <span aria-hidden="true" className={cn("size-1.5 shrink-0 -translate-y-px rounded-full", ACTIVITY_DOT[e.status])} />
            <span className="min-w-0 truncate text-ink">{e.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomelabLine({ summary, alert, onOpen }: { summary: string; alert: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className={cn(panel, "flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-raised/60")}>
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", alert ? "bg-err" : "bg-ok")} />
      <span className="min-w-0 truncate text-meta text-ink">{summary}</span>
    </button>
  );
}
