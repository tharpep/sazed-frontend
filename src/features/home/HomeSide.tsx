import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import type { Project } from "@/api/projects";
import { cn } from "@/lib/utils";

import { MoreLink } from "./Group";
import { goTo, openProject } from "./homeNav";
import type { TodayEntry } from "./summary";

const box = "min-w-0 overflow-hidden rounded-[10px] border border-line bg-surface";
const boxHead = "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-line px-3.5 py-2.5 text-meta font-medium text-ink";

function dateLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** The phone's and narrow page's one Today line, under the counts. */
export function TodayLine({ entries, className }: { entries: TodayEntry[] | null; className?: string }) {
  if (!entries) return null;
  return (
    <p aria-label="Today" className={cn("text-meta text-ink-2", className)}>
      {entries.length === 0 && <span className="text-muted">Nothing on the calendar and no tasks due today.</span>}
      {entries.map((e, i) => (
        <span key={i}>
          {i > 0 && <span className="text-muted"> · </span>}
          {e.timed && <span className="mr-1 font-mono text-muted tabular-nums">{e.when}</span>}
          {e.text}
        </span>
      ))}
    </p>
  );
}

interface TodayBoxProps {
  entries: TodayEntry[] | null;
  failed: boolean;
  className?: string;
}

export function TodayBox({ entries, failed, className }: TodayBoxProps) {
  return (
    <section aria-label="Today" className={cn(box, className)}>
      <h2 className={boxHead}>
        Today <span className="font-normal text-muted">{dateLabel(new Date())}</span>
      </h2>
      <div className="px-3.5 py-2.5">
        {entries === null && <p className="text-meta text-muted">{failed ? "Couldn't reach the calendar." : "Loading…"}</p>}
        {entries?.length === 0 && <p className="text-meta text-muted">Nothing on the calendar and no tasks due.</p>}
        {entries?.map((e, i) => (
          <div key={i} className="grid grid-cols-[52px_minmax(0,1fr)] gap-2.5 py-0.5 text-meta">
            <span className="font-mono text-muted tabular-nums">{e.when}</span>
            <span className="text-ink">{e.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProjectsBox({ projects }: { projects: Project[] | null }) {
  return (
    <section aria-label="Projects by rank" className={box}>
      <h2 className={boxHead}>
        Projects <span className="font-normal text-muted">by rank</span>
        <MoreLink onClick={() => goTo({ hub: "work", view: "projects" })} className="ml-auto">
          All projects
        </MoreLink>
      </h2>
      {projects?.length === 0 && <p className="px-3.5 py-3 text-meta text-muted">No active projects.</p>}
      <ul className="divide-y divide-line">
        {(projects ?? []).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => openProject(p.slug)}
              className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-0.5 px-3.5 py-2 text-left hover:bg-raised"
            >
              <span className="truncate text-body text-ink">{p.title}</span>
              <span className="font-mono text-caption text-muted tabular-nums">
                {p.steps_done}/{p.steps_total}
              </span>
              <span className="col-span-2 truncate text-caption text-muted">{p.current?.title ?? "No open step"}</span>
              <span aria-hidden="true" className="col-span-2 mt-1 block h-[3px] overflow-hidden rounded-sm bg-raised">
                <span
                  className="block h-full bg-muted"
                  style={{ width: `${p.steps_total ? (p.steps_done / p.steps_total) * 100 : 0}%` }}
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface LinkRow {
  key: string;
  label: string;
  text: string;
  alert?: boolean;
  onClick: () => void;
}

/** One-line links out of Home: each names its destination and carries a live summary. */
export function LinkRows({ rows, label }: { rows: LinkRow[]; label: string }): ReactNode {
  if (rows.length === 0) return null;
  return (
    <nav aria-label={label} className={box}>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              onClick={r.onClick}
              className="flex min-h-11 w-full items-center gap-2.5 px-3.5 py-2 text-left hover:bg-raised"
            >
              <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", r.alert ? "bg-err" : "bg-muted")} />
              <span className="line-clamp-2 min-w-0 flex-1 text-meta text-ink">
                <span className="text-muted">{r.label}</span> {r.text}
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
