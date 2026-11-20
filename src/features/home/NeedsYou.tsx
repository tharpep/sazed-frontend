import type { NeedsCard } from "@/api/command";
import { Button, buttonVariants } from "@/components/ui/button";
import { openCardSheet } from "@/features/backlog/CardSheet";
import { mergeCallLine, oldSnapshotText, prName } from "@/features/backlog/proof";
import { cn } from "@/lib/utils";
import { MERGE_LABEL, mergeKind, orderMergeCalls } from "@/widgets/mergeCall";

import { CardActions, TOUCH_BUTTON } from "./CardActions";
import { Group } from "./Group";
import { openDispatch } from "./homeNav";
import { ago } from "./summary";

function failed(card: NeedsCard): boolean {
  if (card.kind === "dispatch") return !card.question;
  return card.job_status === "failed" || card.job_status === "timed_out" || card.ci_state === "failure";
}

const DISPATCH_ID = /^dispatch:([^:]+):/;

function dispatchPlan(card: NeedsCard): string | null {
  return card.kind === "dispatch" ? (DISPATCH_ID.exec(card.id)?.[1] ?? null) : null;
}

interface Props {
  cards: NeedsCard[] | null;
  onOpenJob: (jobId: string) => void;
  onChanged: () => void;
}

export function NeedsYou({ cards, onOpenJob, onChanged }: Props) {
  return (
    <Group name="Needs you" count={cards ? cards.length : null} empty="Nothing is waiting on you.">
      <ul className="divide-y divide-line">
        {orderMergeCalls(cards ?? []).map((card) => {
          const asking = card.job_status === "needs_input";
          const plan = dispatchPlan(card);
          const bad = failed(card);
          const kind = mergeKind(card);
          const merge = kind ? card.pr! : null;
          const open = card.job_id
            ? () => onOpenJob(card.job_id!)
            : plan
              ? () => openDispatch(plan)
              : merge
                ? () => openCardSheet(card)
                : null;
          const old = merge ? oldSnapshotText(merge) : "";
          const body = card.question ?? (merge ? mergeCallLine(merge) : card.next);
          return (
            <li
              key={card.id}
              onClick={open ?? undefined}
              className={cn(
                "grid grid-cols-[22px_minmax(0,1fr)] gap-x-2.5 px-1 pt-2.5 pb-3 sm:rounded-lg sm:px-3",
                open && "cursor-pointer sm:hover:bg-surface"
              )}
            >
              <span aria-hidden="true" className={cn("text-center font-mono text-[15px] leading-5", bad ? "text-err" : "text-warn")}>
                {bad ? "!" : "✻"}
              </span>
              <div className="min-w-0">
                <div className="text-body font-medium [overflow-wrap:anywhere] text-ink">{card.title}</div>
                <div className="text-caption text-muted">
                  {[card.repo, plan && `plan ${plan}`].filter(Boolean).map((part) => `${part} · `).join("")}
                  {card.pr_url && !merge && (
                    <>
                      <a
                        href={card.pr_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:underline"
                      >
                        PR #{card.pr_number}
                      </a>
                      {" · "}
                    </>
                  )}
                  {ago(card.updated_at)}
                  {old && <span className="text-warn"> · snapshot {old}</span>}
                </div>
                {merge && kind && (
                  <p className="mt-1.5 text-meta font-medium text-ink">
                    {MERGE_LABEL[kind]}
                    <span className="font-normal text-muted"> · {prName(merge)}</span>
                  </p>
                )}
                {body && <p className={cn("text-meta [overflow-wrap:anywhere] text-ink-2", merge ? "mt-0.5" : "mt-1.5")}>{body}</p>}
                <div className="mt-2.5 flex flex-wrap items-start justify-end gap-2">
                  {open && !asking && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={TOUCH_BUTTON}
                      onClick={(e) => {
                        e.stopPropagation();
                        open();
                      }}
                    >
                      {card.job_id ? (bad ? "Log" : "Details") : plan ? "Open plan" : "Details"}
                    </Button>
                  )}
                  {/* Merging stays on GitHub: the console only points there. */}
                  {merge && (
                    <a
                      href={merge.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={cn(buttonVariants({ variant: "outline", size: "sm", className: TOUCH_BUTTON }))}
                    >
                      Open PR
                    </a>
                  )}
                  <CardActions
                    key={asking ? "ask" : "act"}
                    cardId={card.id}
                    actions={card.actions}
                    onDone={onChanged}
                    openText={asking ? "answer" : null}
                    touch
                    className={asking ? "min-w-0 flex-1" : undefined}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Group>
  );
}
