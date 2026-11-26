import { useState } from "react";

import { approvePlan } from "@/api/backlog";
import type { NeedsCard } from "@/api/command";
import { errorText } from "@/api/homelab";
import type { ProjectCard } from "@/api/projects";
import { Button, buttonVariants } from "@/components/ui/button";
import { openCardSheet } from "@/features/backlog/CardSheet";
import { mergeCallLine, oldSnapshotText, prName } from "@/features/backlog/proof";
import { backlogId } from "@/features/backlog/stages";
import { cn } from "@/lib/utils";
import { MERGE_LABEL, mergeKind, orderMergeCalls } from "@/widgets/mergeCall";

import { CardActions, TOUCH_BUTTON } from "./CardActions";
import { Group, MoreLink } from "./Group";
import { goTo, openDispatch } from "./homeNav";
import { ago } from "./summary";

function failed(card: NeedsCard): boolean {
  if (card.kind === "dispatch") return !card.question;
  return card.job_status === "failed" || card.job_status === "timed_out" || card.ci_state === "failure";
}

const DISPATCH_ID = /^dispatch:([^:]+):/;

function dispatchPlan(card: NeedsCard): string | null {
  return card.kind === "dispatch" ? (DISPATCH_ID.exec(card.id)?.[1] ?? null) : null;
}

// Waiting shows a few plans to approve; the rest stay on the board, so Home keeps reading calmly.
export const PLAN_ROWS = 3;

function PlanRow({ card, onChanged }: { card: ProjectCard; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const where = [card.plan_section && `Section ${card.plan_section}`, card.plan_version != null && `v${card.plan_version}`]
    .filter(Boolean)
    .join(", ");
  async function approve() {
    const id = backlogId(card);
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await approvePlan(id);
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <li
      onClick={() => openCardSheet(card)}
      className="grid cursor-pointer grid-cols-[22px_minmax(0,1fr)] gap-x-2.5 px-1 pt-2.5 pb-3 sm:rounded-lg sm:px-3 sm:hover:bg-surface"
    >
      <span aria-hidden="true" className="flex h-5 items-center justify-center">
        <i className="block size-2.5 rounded-full border-[1.5px] border-warn" />
      </span>
      <div className="min-w-0">
        <div className="text-body font-medium [overflow-wrap:anywhere] text-ink">Approve the plan: {card.title}</div>
        <p className="mt-0.5 text-meta [overflow-wrap:anywhere] text-ink-2">
          {where ? `${where}. ` : ""}Approving does not start it.
        </p>
        <p className="text-caption text-muted">
          {[card.next, card.repo, ago(card.updated_at)].filter(Boolean).join(" · ")}
        </p>
        {error && <p role="alert" className="mt-1 text-meta text-err">{error}</p>}
        <div className="mt-2.5 flex justify-start">
          <Button
            size="sm"
            variant="outline"
            className={TOUCH_BUTTON}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              approve();
            }}
          >
            {busy ? "Approving…" : "Approve plan"}
          </Button>
        </div>
      </div>
    </li>
  );
}

/** "Approve the plan" rows, at most PLAN_ROWS, then "N more" and the Ready to start line. */
function PlanRows({ plans, readyToStart, onChanged }: { plans: ProjectCard[]; readyToStart?: number; onChanged: () => void }) {
  const toBoard = () => goTo({ hub: "work", view: "board" });
  const more = plans.length - PLAN_ROWS;
  return (
    <>
      {plans.slice(0, PLAN_ROWS).map((card) => (
        <PlanRow key={card.id} card={card} onChanged={onChanged} />
      ))}
      {(more > 0 || readyToStart !== undefined) && (
        <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 pl-[34px] pr-1 text-meta text-muted sm:pr-3 sm:pl-[44px]">
          {readyToStart !== undefined && (
            <span className="inline-flex items-center gap-3">
              Ready to start: {readyToStart} {readyToStart === 1 ? "card" : "cards"} with approved plans.
              {readyToStart > 0 && <MoreLink onClick={toBoard}>Show</MoreLink>}
            </span>
          )}
          {more > 0 && (
            <MoreLink onClick={toBoard} className="ml-auto">
              {more} more {more === 1 ? "plan" : "plans"} to approve
            </MoreLink>
          )}
        </li>
      )}
    </>
  );
}

interface Props {
  cards: NeedsCard[] | null;
  onOpenJob: (jobId: string) => void;
  onChanged: () => void;
  /** Questions from sessions, which sit on their rows under Running rather than here. */
  onRuns?: number;
  /** Cards on an active plan waiting for approval; absent from a Sazed before slice 4. */
  plans?: ProjectCard[];
  readyToStart?: number;
}

export function NeedsYou({ cards, onOpenJob, onChanged, onRuns = 0, plans = [], readyToStart }: Props) {
  const planRows = Math.min(plans.length, PLAN_ROWS);
  return (
    <Group
      name="Needs you"
      count={cards ? cards.length + onRuns + planRows : null}
      empty="Nothing is waiting on you."
      extra={
        onRuns > 0 && (
          <span className="text-meta font-normal text-muted">
            {onRuns} {onRuns === 1 ? "sits on its run" : "sit on their runs"} below
          </span>
        )
      }
    >
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
        {cards && <PlanRows plans={plans} readyToStart={readyToStart} onChanged={onChanged} />}
      </ul>
    </Group>
  );
}
