import { ArrowLeft } from "lucide-react";

import type { Project, ProjectCard } from "@/api/projects";
import { ProgressBar, STATUS_LABEL, STATUS_TEXT } from "./projectParts";

interface ProjectWidgetProps extends Project {
  /** Absent in MCP Apps hosts, where there is no list to go back to. */
  onBack?: () => void;
}

function CardLine({ card }: { card: ProjectCard }) {
  return (
    <li className="flex flex-col gap-0.5 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className={card.stage === "done" ? "min-w-0 text-body text-ink-2" : "min-w-0 text-body text-ink"}>
          {card.title}
        </span>
        <span className="flex shrink-0 items-baseline gap-2 text-caption text-muted">
          {card.repo && <span className="font-mono">{card.repo}</span>}
          {card.pr_url && (
            <a href={card.pr_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              {card.pr_number ? `PR #${card.pr_number}` : "PR"}
            </a>
          )}
        </span>
      </div>
      {card.next && <span className="text-meta text-ink-2">{card.next}</span>}
    </li>
  );
}

function CardList({ title, items }: { title: string; items: { card: ProjectCard; step: string }[] }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 md:p-4">
      <h3 className="text-meta text-muted">
        {title} <span className="font-mono text-caption">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-meta text-muted">Nothing.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(({ card, step }) => (
            <li key={card.id} className="flex flex-col">
              <span className="text-meta text-ink">{card.title}</span>
              <span className="text-caption text-muted">{step}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProjectWidget({ onBack, ...project }: ProjectWidgetProps) {
  const { progress, workstreams } = project;
  const all = workstreams.flatMap((w) => (w.cards ?? []).map((card) => ({ card, step: w.title })));
  const byStage = (stage: ProjectCard["stage"]) => all.filter((x) => x.card.stage === stage);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 inline-flex items-center gap-1 self-start rounded-md px-1 py-0.5 text-meta text-ink-2 transition-colors hover:bg-raised hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Projects
          </button>
        )}
        <h2 className="text-title font-semibold text-ink">{project.title}</h2>
        <p className="text-meta text-ink-2">{project.latest_update ?? project.headline}</p>
        <div className="flex items-center gap-3">
          <ProgressBar progress={progress} className="max-w-xs flex-1" />
          <span className="font-mono text-caption whitespace-nowrap text-muted tabular-nums">
            {progress.done}/{progress.total} done
          </span>
        </div>
      </div>

      <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {workstreams.map((w, i) => (
          <li key={w.id} className="flex flex-col gap-1 px-3 py-3 md:px-4">
            <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 md:grid-cols-[1.5rem_minmax(0,1fr)_7rem_4rem_5rem]">
              <span className="font-mono text-caption text-muted tabular-nums">{i + 1}</span>
              <span className="min-w-0 text-body font-medium text-ink">{w.title}</span>
              <span className={`text-caption md:order-5 md:text-right ${STATUS_TEXT[w.status]}`}>{STATUS_LABEL[w.status]}</span>
              <ProgressBar
                progress={w.progress}
                className="col-span-3 self-center md:order-3 md:col-span-1 md:min-w-0"
              />
              <span className="hidden font-mono text-caption whitespace-nowrap text-muted tabular-nums md:order-4 md:inline">
                {w.progress.done}/{w.progress.total}
              </span>
            </div>
            <div className="pl-9 text-caption text-muted md:hidden">
              <span className="font-mono">
                {w.progress.done}/{w.progress.total}
              </span>{" "}
              cards done
            </div>
            {w.summary && <p className="pl-9 text-meta text-ink-2">{w.summary}</p>}
            {w.cards && w.cards.length > 0 && (
              <ul className="flex flex-col divide-y divide-line pl-9">
                {w.cards.map((c) => (
                  <CardLine key={c.id} card={c} />
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-3 md:divide-x md:divide-y-0">
        <CardList title="In flight" items={byStage("doing")} />
        <CardList title="Needs you" items={byStage("needs_me")} />
        <CardList title="Next" items={byStage("next")} />
      </div>
    </div>
  );
}
