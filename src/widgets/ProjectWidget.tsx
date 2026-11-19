import { useState, type ReactNode } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";

import type { Project, ProjectCard, Workstream } from "@/api/projects";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_TEXT } from "./projectParts";
import {
  cardFacts,
  countLine,
  foldSteps,
  GROUP_NAME,
  groupStepCards,
  projectLine,
  stepNumbers,
  visibleNext,
  type GroupedCards,
} from "./projectWork";
import { CardSquares, StepSquare, StepTrack } from "./stepTrack";

const GROUP_SHOWN = 8;

interface ProjectWidgetProps extends Project {
  /** Absent in MCP Apps hosts, where there is no list to go back to. */
  onBack?: () => void;
  /** Absent in MCP Apps hosts, which stay read-only. */
  onOpenCard?: (card: ProjectCard) => void;
}

const ROW = "grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-x-2.5 px-3 py-2.5 text-left md:px-4";

function CardRow({ card, onOpen }: { card: ProjectCard; onOpen?: (card: ProjectCard) => void }) {
  const facts = cardFacts(card);
  const title = <span className={cn("line-clamp-2 text-body", card.stage === "done" ? "text-ink-2" : "text-ink")}>{card.title}</span>;
  const factLine = facts.text && (
    <span className={cn("block truncate text-caption", facts.warn ? "text-warn" : "text-muted")}>{facts.text}</span>
  );
  const shape = "-mx-2 flex w-[calc(100%+1rem)] flex-col justify-center gap-0.5 rounded-md px-2 py-1.5 text-left";
  if (onOpen) {
    return (
      <li>
        <button type="button" onClick={() => onOpen(card)} className={cn(shape, "min-h-11 hover:bg-raised sm:min-h-0")}>
          {title}
          {factLine}
        </button>
      </li>
    );
  }
  // Read-only hosts (MCP Apps) have no sheet, so the row itself carries the PR link and the next step.
  const next = visibleNext(card);
  return (
    <li className={shape}>
      <span className="flex items-baseline justify-between gap-3">
        {title}
        {card.pr_url && (
          <a href={card.pr_url} target="_blank" rel="noreferrer" className="shrink-0 text-caption text-primary hover:underline">
            {card.pr_number ? `PR #${card.pr_number}` : "PR"}
          </a>
        )}
      </span>
      {factLine}
      {next && !facts.text.includes(next) && <span className="text-meta text-ink-2">{next}</span>}
    </li>
  );
}

function Group({ group, onOpen }: { group: GroupedCards; onOpen?: (card: ProjectCard) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? group.cards : group.cards.slice(0, GROUP_SHOWN);
  return (
    <section aria-label={GROUP_NAME[group.group]} className="flex flex-col">
      <h4 className="flex items-baseline gap-2 py-1 text-meta font-medium text-ink-2">
        {GROUP_NAME[group.group]}
        <span className="font-mono font-normal text-muted tabular-nums">{group.cards.length}</span>
      </h4>
      <ul className="flex flex-col">
        {shown.map((c) => (
          <CardRow key={c.id} card={c} onOpen={onOpen} />
        ))}
      </ul>
      {group.cards.length > GROUP_SHOWN && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="inline-flex min-h-11 items-center self-start text-meta text-primary hover:underline sm:min-h-8"
        >
          {all ? "Show fewer" : `Show all ${group.cards.length}`}
        </button>
      )}
    </section>
  );
}

function StepRow({
  step,
  number,
  open,
  current,
  onToggle,
  onOpen,
}: {
  step: Workstream;
  number: number | undefined;
  open: boolean;
  current: boolean;
  onToggle: () => void;
  onOpen?: (card: ProjectCard) => void;
}) {
  const cards = step.cards ?? [];
  const groups = groupStepCards(cards);
  return (
    <li className="flex flex-col">
      <button type="button" aria-expanded={open} onClick={onToggle} className={cn(ROW, "min-h-12 hover:bg-raised")}>
        <StepSquare step={step} number={number} current={current} className="size-6" />
        <span className="min-w-0">
          <span className={cn("block text-body", current || open ? "font-medium text-ink" : "text-ink-2")}>
            <span className="sr-only">{number ? `Step ${number}: ` : "Dropped step: "}</span>
            {step.title}
          </span>
          <span className="block text-caption text-muted">
            {step.progress.total ? `${step.progress.done} of ${step.progress.total} done` : "No cards"}
          </span>
        </span>
        <span className={cn("text-caption whitespace-nowrap", STATUS_TEXT[step.status])}>{STATUS_LABEL[step.status]}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 pr-3 pb-3 pl-[46px] md:pr-4 md:pl-[50px]">
          {step.summary && <p className="text-meta text-ink-2">{step.summary}</p>}
          {cards.length === 0 ? (
            <p className="text-meta text-muted">No cards under this step.</p>
          ) : (
            <>
              <p className="text-meta text-ink-2">{countLine(groups)}</p>
              <CardSquares cards={cards} />
              {groups.map((g) => (
                <Group key={g.group} group={g} onOpen={onOpen} />
              ))}
            </>
          )}
        </div>
      )}
    </li>
  );
}

function CardList({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: { card: ProjectCard; step: string }[];
  onOpen?: (card: ProjectCard) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-3 md:p-4">
      <h3 className="text-meta text-muted">
        {title} <span className="font-mono text-caption">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-meta text-muted">Nothing.</p>
      ) : (
        <ul className="flex flex-col">
          {items.map(({ card, step }) => {
            const body = (
              <>
                <span className="text-meta text-ink">{card.title}</span>
                <span className="text-caption text-muted">{step}</span>
              </>
            );
            const shape = "-mx-2 flex w-[calc(100%+1rem)] flex-col justify-center rounded-md px-2 py-1 text-left";
            return (
              <li key={card.id}>
                {onOpen ? (
                  <button type="button" onClick={() => onOpen(card)} className={cn(shape, "min-h-11 hover:bg-raised sm:min-h-0")}>
                    {body}
                  </button>
                ) : (
                  <div className={shape}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ProjectWidget({ onBack, onOpenCard, ...project }: ProjectWidgetProps) {
  const { workstreams } = project;
  const currentId = project.current?.id ?? null;
  // Held here rather than per row, so a poll that reorders steps keeps what Pryce opened.
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(currentId ? [currentId] : []));
  const [foldOpen, setFoldOpen] = useState(false);
  const all = workstreams.flatMap((w) => (w.cards ?? []).map((card) => ({ card, step: w.title })));
  const byStage = (stage: ProjectCard["stage"]) => all.filter((x) => x.card.stage === stage);

  function toggle(id: string) {
    const next = new Set(open);
    if (!next.delete(id)) next.add(id);
    setOpen(next);
  }

  const numbers = stepNumbers(workstreams);
  const stepRow = (step: Workstream): ReactNode => (
    <StepRow
      key={step.id}
      step={step}
      number={numbers.get(step.id)}
      open={open.has(step.id)}
      current={step.id === currentId}
      onToggle={() => toggle(step.id)}
      onOpen={onOpenCard}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start rounded-md px-1 py-0.5 text-meta sm:min-h-0 text-ink-2 transition-colors hover:bg-raised hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Projects
          </button>
        )}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-title font-semibold text-ink">{project.title}</h2>
          <p className="text-meta text-muted">{projectLine(project)}</p>
        </div>
        {workstreams.length > 0 && <StepTrack steps={workstreams} currentId={currentId} />}
        <p className="text-meta text-ink-2">{project.latest_update ?? project.headline}</p>
      </div>

      <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {foldSteps(workstreams).map((entry) =>
          entry.kind === "step" ? (
            stepRow(entry.step)
          ) : (
            <li key="fold" className="flex flex-col divide-y divide-line">
              <button
                type="button"
                aria-expanded={foldOpen}
                onClick={() => setFoldOpen(!foldOpen)}
                className={cn(ROW, "min-h-12 hover:bg-raised")}
              >
                <span aria-hidden="true" className="grid size-6 place-items-center text-caption text-ok">
                  {"✓"}
                </span>
                <span className="min-w-0">
                  <span className="block text-body text-ink-2">1 to {entry.steps.length} done</span>
                  <span className="line-clamp-2 text-caption text-muted">{entry.steps.map((s) => s.step.title).join(", ")}</span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className={cn("mt-0.5 size-4 text-muted transition-transform motion-reduce:transition-none", foldOpen && "rotate-90")}
                />
              </button>
              {foldOpen && <ol className="flex flex-col divide-y divide-line bg-bg/40">{entry.steps.map((s) => stepRow(s.step))}</ol>}
            </li>
          )
        )}
      </ol>

      <div className="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-3 md:divide-x md:divide-y-0">
        <CardList title="In flight" items={byStage("doing")} onOpen={onOpenCard} />
        <CardList title="Needs you" items={byStage("needs_me")} onOpen={onOpenCard} />
        <CardList title="Next" items={byStage("next")} onOpen={onOpenCard} />
      </div>
    </div>
  );
}
