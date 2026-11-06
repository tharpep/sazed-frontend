import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Project } from "@/api/projects";
import { Legend, ProgressBar, STATUS_LABEL, STATUS_TEXT } from "./projectParts";

interface ProjectsWidgetProps {
  projects: Project[];
  /** Absent in MCP Apps hosts, where the title is plain text. */
  onOpen?: (slug: string) => void;
}


export function ProjectsWidget({ projects, onOpen }: ProjectsWidgetProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(slug: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  if (projects.length === 0) return <p className="text-meta text-muted">No projects yet.</p>;

  return (
    <div className="flex flex-col gap-2">
      <Legend />
      <div className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {projects.map((p) => {
          const open = expanded.has(p.slug);
          return (
            <div key={p.id}>
              <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-x-1 gap-y-1.5 px-2 py-3 md:grid-cols-[1.75rem_minmax(0,1.2fr)_minmax(8rem,1fr)_6.5rem] md:gap-x-4 md:px-3">
                <button
                  type="button"
                  onClick={() => toggle(p.slug)}
                  aria-expanded={open}
                  aria-label={`${open ? "Collapse" : "Expand"} ${p.title}`}
                  className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink"
                >
                  <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} aria-hidden="true" />
                </button>
                {onOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpen(p.slug)}
                    className="min-w-0 truncate text-left text-body font-medium text-ink hover:text-primary hover:underline"
                  >
                    {p.title}
                  </button>
                ) : (
                  <span className="min-w-0 truncate text-body font-medium text-ink">{p.title}</span>
                )}
                <div className="col-start-2 flex items-center gap-3 md:col-start-3">
                  <ProgressBar bar={p.bar} className="flex-1" />
                  <span className="flex flex-col items-end font-mono text-caption whitespace-nowrap text-muted tabular-nums md:hidden">
                    <span>{p.steps_done}/{p.steps_total} steps</span>
                    <span>{p.progress.done}/{p.progress.total} cards</span>
                  </span>
                </div>
                <div className="hidden flex-col items-end text-caption whitespace-nowrap text-muted tabular-nums md:flex">
                  <span className="font-mono">
                    {p.steps_done}/{p.steps_total} steps
                  </span>
                  <span className="font-mono">
                    {p.progress.done}/{p.progress.total} cards
                  </span>
                </div>
                <p className="col-start-2 text-meta text-ink-2 md:col-span-3 md:col-start-2">
                  {p.latest_update ?? p.headline}
                </p>
              </div>
              {open &&
                p.workstreams.map((w) => (
                  <div
                    key={w.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-line bg-bg py-2 pr-3 pl-10 text-meta md:grid-cols-[1.75rem_minmax(0,1.2fr)_minmax(8rem,1fr)_6.5rem] md:px-3"
                  >
                    <span className="hidden md:block" aria-hidden="true" />
                    <span className="min-w-0 truncate text-ink">{w.title}</span>
                    <span className="text-right font-mono text-caption whitespace-nowrap text-muted tabular-nums md:order-4">
                      {w.progress.done}/{w.progress.total} ·{" "}
                      <span className={STATUS_TEXT[w.status]}>{STATUS_LABEL[w.status]}</span>
                    </span>
                    <ProgressBar bar={w.bar} className="col-span-2 md:order-3 md:col-span-1" />
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
