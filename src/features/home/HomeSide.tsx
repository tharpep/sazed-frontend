import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import type { Project, ProjectCard } from "@/api/projects";
import { openCardSheet } from "@/features/backlog/CardSheet";
import { cn } from "@/lib/utils";
import { prRef } from "@/widgets/projectWork";
import { MiniTrack } from "@/widgets/stepTrack";

import { MoreLink } from "./Group";
import { goTo, openProject } from "./homeNav";
import { clockOf, firstRows, shippedDays } from "./shipped";
import type { Today } from "./summary";

const box = "min-w-0 overflow-hidden rounded-[10px] border border-line bg-surface";
const boxHead = "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-line px-3.5 py-2.5 text-meta font-medium text-ink";

function dateLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** The phone's and narrow page's one Today line, under the counts. */
export function TodayLine({ today, className }: { today: Today; className?: string }) {
  const entries = today.entries ?? [];
  if (entries.length === 0 && !today.note) return null;
  return (
    <p aria-label="Today" className={cn("text-meta text-ink-2", className)}>
      {entries.map((e, i) => (
        <span key={i}>
          {i > 0 && <span className="text-muted"> · </span>}
          {e.timed && <span className="mr-1 font-mono text-muted tabular-nums">{e.when}</span>}
          {e.text}
        </span>
      ))}
      {today.note && (
        <span className="text-muted">
          {entries.length > 0 && " · "}
          {today.note}
        </span>
      )}
    </p>
  );
}

export function TodayBox({ today, className }: { today: Today; className?: string }) {
  return (
    <section aria-label="Today" className={cn(box, className)}>
      <h2 className={boxHead}>
        Today <span className="font-normal text-muted">{dateLabel(new Date())}</span>
      </h2>
      <div className="px-3.5 py-2.5">
        {today.entries?.map((e, i) => (
          <div key={i} className="grid grid-cols-[52px_minmax(0,1fr)] gap-2.5 py-0.5 text-meta">
            <span className="font-mono text-muted tabular-nums">{e.when}</span>
            <span className="text-ink">{e.text}</span>
          </div>
        ))}
        {(today.note || !today.entries) && (
          <p className="py-0.5 text-meta text-muted">{today.note ?? "Loading…"}</p>
        )}
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
              <span className="col-span-2 min-w-0">
                <MiniTrack steps={p.workstreams} currentId={p.current?.id ?? null} />
              </span>
              <span className="col-span-2 truncate text-caption text-muted">{projectRowLine(p)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function projectRowLine(p: Project): string {
  const at = p.current ? p.workstreams.findIndex((w) => w.id === p.current!.id) : -1;
  const step = p.current ? `Step ${at + 1}: ${p.current.title}` : "No open step";
  return `${step} · ${p.progress.done} of ${p.progress.total} cards done`;
}

const SHIPPED_SHOWN = 8;

/** Done cards from the board's 14 days by local day; a row opens the card over Home. */
export function ShippedBox({ cards, projectOf }: { cards: ProjectCard[] | null; projectOf: Map<string, string> }) {
  const [all, setAll] = useState(false);
  const days = cards ? shippedDays(cards) : [];
  const total = days.reduce((n, d) => n + d.cards.length, 0);
  const shown = all ? days : firstRows(days, SHIPPED_SHOWN);
  return (
    <section aria-label="Shipped" className={box}>
      <h2 className={boxHead}>
        Shipped <span className="font-mono font-normal text-muted tabular-nums">{cards ? total : "…"}</span>
        <span className="ml-auto font-normal text-muted">last 14 days</span>
      </h2>
      {shown.map((d) => (
        <div key={d.key}>
          <h3 className="flex items-baseline gap-1.5 px-3.5 pt-2.5 pb-0.5 text-caption font-medium text-ink-2">
            {d.label}
            <span className="font-mono font-normal text-muted tabular-nums">{d.cards.length || "none"}</span>
          </h3>
          <ul className="divide-y divide-line">
            {d.cards.map((c) => {
              const project = c.workstream_id ? projectOf.get(c.workstream_id) : undefined;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openCardSheet(c)}
                    className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-0.5 px-3.5 py-2 text-left hover:bg-raised"
                  >
                    <span className="line-clamp-2 text-meta text-ink">{c.title}</span>
                    <span className="font-mono text-caption text-muted tabular-nums">{clockOf(c.done_at!)}</span>
                    <span className="col-span-2 truncate text-caption text-muted">
                      {[project, prRef(c.session_link) ?? "Marked done"].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {total > SHIPPED_SHOWN && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="flex min-h-11 w-full items-center border-t border-line px-3.5 text-meta text-muted hover:bg-raised hover:text-ink sm:min-h-9"
        >
          {all ? "Show fewer" : `Show all ${total}`}
        </button>
      )}
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
