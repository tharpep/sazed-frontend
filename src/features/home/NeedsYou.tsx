import type { NeedsCard } from "@/api/command";
import { cn } from "@/lib/utils";

import { CardActions } from "./CardActions";

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

function tone(card: NeedsCard): string {
  if (card.job_status === "failed" || card.job_status === "timed_out" || card.ci_state === "failure") return "bg-err";
  if (card.actions.some((a) => a.id === "merge")) return "bg-ok";
  return "bg-accent";
}

interface Props {
  cards: NeedsCard[];
  onOpenJob: (jobId: string) => void;
  onChanged: () => void;
}

export function NeedsYou({ cards, onOpenJob, onChanged }: Props) {
  return (
    <section aria-label="Needs you" className="overflow-hidden rounded-lg border border-line bg-surface">
      <h2 className="border-b border-line px-3.5 py-2.5 text-meta font-semibold text-ink">
        Needs you <span className="font-normal text-muted">{cards.length}</span>
      </h2>
      {cards.length === 0 && <p className="px-3.5 py-3 text-meta text-muted">Nothing is waiting on you.</p>}
      <ul className="divide-y divide-line">
        {cards.map((card) => {
          const asking = card.job_status === "needs_input";
          return (
            <li
              key={card.id}
              className={cn("px-3.5 py-2.5", card.job_id && "cursor-pointer hover:bg-raised/60")}
              onClick={() => card.job_id && onOpenJob(card.job_id)}
            >
              <div className="flex items-center gap-2.5">
                <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", tone(card))} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body text-ink">
                    {card.title} {card.repo && <span className="text-muted">{card.repo}</span>}
                  </div>
                  <div className="truncate text-caption text-muted">
                    {card.next}
                    {card.pr_number ? ` · PR #${card.pr_number}` : ""} · {ago(card.updated_at)}
                  </div>
                </div>
                {!asking && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {card.pr_url && (
                      <a
                        href={card.pr_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hidden text-meta text-primary hover:underline sm:inline"
                      >
                        PR
                      </a>
                    )}
                    <CardActions cardId={card.id} actions={card.actions} onDone={onChanged} />
                  </div>
                )}
              </div>
              {asking && (
                <div className="mt-1.5 flex flex-col gap-1.5 pl-[18px]">
                  {card.question && <p className="text-body text-ink">{card.question}</p>}
                  <CardActions cardId={card.id} actions={card.actions} onDone={onChanged} openText="answer" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
