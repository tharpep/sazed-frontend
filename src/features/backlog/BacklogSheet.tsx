import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button, buttonVariants } from "@/components/ui/button";
import { DetailPanel } from "@/components/shell/DetailPanel";
import { cn } from "@/lib/utils";
import {
  approveBacklogItem,
  moveBacklogItem,
  planWrite,
  updateBacklogItem,
  type BacklogItem,
  type PlanAction,
} from "@/api/backlog";
import { errorText } from "@/api/homelab";
import type { ProjectCard } from "@/api/projects";
import { claudeLink, type Session } from "@/api/sessions";
import { mergeLabelOf } from "@/widgets/mergeCall";
import { PLAN_NEXT, planStep, sessionLabel, visibleNext } from "@/widgets/projectWork";
import { openPlanSection, PlanStrip, useCardPlan } from "./PlanStrip";
import { ProofBlock } from "./ProofBlock";
import { SessionNow } from "./SessionNow";
import { REPOS, STATUS_LABEL, TYPE_LABEL, ageLabel, isOpenStatus, sourceLabel, workLabel } from "./format";

interface Props {
  item: BacklogItem | null;
  /** The board's card for the item, which carries its PR snapshot; the backlog item has none. */
  card?: ProjectCard | null;
  /** The card's session from the live command poll; it wins over the card's older snapshot. */
  liveSessionId?: string | null;
  /** Open with a loading state while the item is fetched, so a tap shows the sheet at once. */
  loading?: boolean;
  /** How many open items have a priority, for "#3 of 14" and the last-place check. */
  rankedCount: number;
  onClose: () => void;
  onChanged: (item: BacklogItem) => void;
  onOpenJob: (id: string) => void;
  /** A plan-state route answered, or a refusal reloaded the card: the page reloads its cards. */
  onCardChanged: (card: ProjectCard) => void;
  /** The card's live session when it says it is an orchestrator. */
  orchestrator?: Pick<Session, "session_id"> | null;
}

const field =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-body text-ink outline-none placeholder:text-muted focus-visible:border-primary";

const FOOTER_BUTTON = "h-11 min-w-24 flex-1 px-4 sm:h-8 sm:flex-none";
const BODY_BUTTON = "h-11 px-3 sm:h-7 sm:px-2.5";

export function BacklogSheet({
  item,
  card: cardProp,
  liveSessionId = null,
  loading = false,
  rankedCount,
  onClose,
  onChanged,
  onOpenJob,
  onCardChanged,
  orchestrator = null,
}: Props) {
  const [repo, setRepo] = useState("");
  const [note, setNote] = useState("");
  const [approving, setApproving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The sheet stays mounted from card to card, so an action still running for the last card must
  // not disable, fail or collapse the form of the card on screen now.
  const shownId = useRef(item?.id);
  useEffect(() => {
    shownId.current = item?.id;
    setRepo(item?.repos[0] ?? "");
    setNote("");
    setApproving(false);
    setBusy(false);
    setError(null);
  }, [item?.id]);

  async function act(fn: () => Promise<BacklogItem>) {
    const id = item?.id;
    setBusy(true);
    setError(null);
    try {
      const updated = await fn();
      if (shownId.current === id) setApproving(false);
      onChanged(updated);
    } catch (err) {
      if (shownId.current === id) setError(errorText(err));
    } finally {
      if (shownId.current === id) setBusy(false);
    }
  }

  // The card a plan-state route answered with, shown until the page's own copy is replaced.
  const [answered, setAnswered] = useState<ProjectCard | null>(null);
  useEffect(() => setAnswered(null), [cardProp]);
  const card = answered && item && answered.id === `item:${item.id}` ? answered : cardProp;
  const [pending, setPending] = useState<PlanAction | null>(null);

  async function actCard(action: PlanAction) {
    const id = item?.id;
    if (!id) return;
    setBusy(true);
    setPending(action);
    setError(null);
    const { card: next, error: refused } = await planWrite(action, id);
    if (next) onCardChanged(next);
    if (shownId.current !== id) return;
    if (next) setAnswered(next);
    setError(refused);
    setBusy(false);
    setPending(null);
  }

  // The form starts fresh: a refusal from a plan write says nothing about the worker job.
  function openJobForm() {
    setError(null);
    setApproving(true);
  }

  const isOpen = item !== null && isOpenStatus(item.status);
  const work = item ? workLabel(item) : null;
  const step = card ? planStep(card) : null;
  const cardPlan = useCardPlan(step ? (card?.plan_id ?? null) : null, card?.plan_section ?? null);
  const planRef =
    card?.plan_id &&
    [cardPlan ? `plan ${cardPlan.slug}` : "plan", card.plan_section && `section ${card.plan_section}`, card.plan_version != null && `v${card.plan_version}`]
      .filter(Boolean)
      .join(", ");
  const asking = step === "plan" || step === "stale";
  // The worker job is the way a card gets built without a terminal until an orchestrator runs.
  const jobPath =
    isOpen && !item?.session_label && !liveSessionId && (step === "ready" || (step === "started" && card?.next === PLAN_NEXT.started));

  function footerButton(label: string, onClick: () => void, opts: { primary?: boolean; disabled?: boolean } = {}) {
    return (
      <Button
        key={label}
        variant={opts.primary ? "default" : "outline"}
        className={FOOTER_BUTTON}
        disabled={busy || opts.disabled}
        onClick={onClick}
      >
        {label}
      </Button>
    );
  }

  // A card a terminal session is building has its PR already: Approve would start a second,
  // worker-built PR, so the sheet points at the session's PR instead.
  const sessionPr =
    item?.pr_repo && item.pr_number != null ? `https://github.com/${item.pr_repo}/pull/${item.pr_number}` : null;
  const talk = orchestrator && (
    <a
      key="Talk to orchestrator"
      href={claudeLink(orchestrator)}
      target="_blank"
      rel="noreferrer"
      className={cn(buttonVariants({ variant: "default", className: FOOTER_BUTTON }))}
    >
      Talk to orchestrator
    </a>
  );
  const baseButtons = !item
    ? []
    : isOpen && item.session_label
      ? [
          footerButton("Dismiss", () => act(() => updateBacklogItem(item.id, { status: "dismissed" }))),
          ...(sessionPr
            ? [
                <a
                  key="Open PR"
                  href={sessionPr}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: talk ? "outline" : "default", className: FOOTER_BUTTON }))}
                >
                  Open PR
                </a>,
              ]
            : []),
        ]
      : isOpen && approving
      ? [
          footerButton("Back", () => setApproving(false)),
          footerButton(busy ? "Starting…" : "Start the PR", () => act(() => approveBacklogItem(item.id, repo.trim(), note)), {
            primary: true,
            disabled: !repo.trim(),
          }),
        ]
      : isOpen && asking
        ? [
            ...(cardPlan ? [footerButton("Open plan section", () => openPlanSection(cardPlan.slug, card?.plan_section ?? null))] : []),
            footerButton(pending === "approve" ? "Approving…" : step === "stale" ? "Approve plan again" : "Approve plan", () => actCard("approve"), {
              primary: true,
            }),
          ]
        : isOpen && step === "ready"
          ? [footerButton(pending === "start" ? "Starting…" : "Start", () => actCard("start"), { primary: true })]
          : isOpen && step === "started"
            ? []
            : isOpen
              ? [
                  footerButton("Dismiss", () => act(() => updateBacklogItem(item.id, { status: "dismissed" }))),
                  footerButton("Approve", openJobForm, { primary: true }),
                ]
              : item.status === "approved"
                ? [footerButton("Mark done", () => act(() => updateBacklogItem(item.id, { status: "done" })))]
                : [footerButton("Restore", () => act(() => updateBacklogItem(item.id, { status: "new" })))];
  const footerButtons = talk && !approving ? [...baseButtons, talk] : baseButtons;
  // A write's error sits in the footer, beside the button that sent it, so a phone shows it in view.
  const footer = footerButtons.length > 0 && (
    <>
      {error && (
        <p role="alert" className="basis-full text-body [overflow-wrap:anywhere] text-destructive">
          {error}
        </p>
      )}
      <span className="hidden flex-1 sm:block" />
      {footerButtons}
    </>
  );
  const facts = item
    ? [
        TYPE_LABEL[item.type],
        item.effort && `effort ${item.effort}`,
        item.impact && `${item.impact} impact`,
        sourceLabel(item.source),
        ageLabel(item.created_at),
      ].filter(Boolean)
    : [];

  return (
    <DetailPanel
      open={item !== null || loading}
      title={item?.title ?? (loading ? "Loading…" : "Item")}
      description={
        item && (
          <>
            <span className={cn(item.status === "shortlisted" && "text-accent")}>{STATUS_LABEL[item.status]}</span>
            {" · "}
            {facts.join(" · ")}
            {step && card && (
              <span className={cn("block", asking || step === "ready" ? "text-warn" : "text-ink-2")}>
                {[card.next, planRef].filter(Boolean).join(" · ")}
              </span>
            )}
          </>
        )
      }
      onClose={onClose}
      footer={footer || undefined}
    >
      {!item && loading && <p className="text-body text-muted">Loading the card…</p>}
      {item && (
        <>
          {step && card && (
            <section aria-label="Plan" className="flex flex-col gap-2">
              <PlanStrip step={step} card={card} />
              {cardPlan?.text && (
                <div className="flex flex-col gap-1">
                  <h3 className="text-body font-medium text-ink">The plan</h3>
                  <div className="prose-journal line-clamp-[12] text-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{cardPlan.text}</ReactMarkdown>
                  </div>
                </div>
              )}
              {asking && isOpen && <p className="text-caption text-muted">Approving says the design is right. It does not start anything.</p>}
              {step === "started" && card.next === PLAN_NEXT.started && (
                <p className="text-caption text-muted">Waiting for an orchestrator to pick it up from the board.</p>
              )}
              {isOpen && !approving && (
                <div className="flex flex-wrap items-center gap-2">
                  {jobPath && (
                    <Button size="sm" variant="outline" className={BODY_BUTTON} disabled={busy} onClick={openJobForm}>
                      or run it as one worker job
                    </Button>
                  )}
                  {card.started && (
                    <Button size="sm" variant="ghost" className={BODY_BUTTON} disabled={busy} onClick={() => actCard("withdraw-start")}>
                      Withdraw start
                    </Button>
                  )}
                  {card.plan_approval && (
                    <Button size="sm" variant="ghost" className={BODY_BUTTON} disabled={busy} onClick={() => actCard("withdraw-approval")}>
                      Withdraw approval
                    </Button>
                  )}
                  {step !== "started" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(BODY_BUTTON, "ml-auto")}
                      disabled={busy}
                      onClick={() => act(() => updateBacklogItem(item.id, { status: "dismissed" }))}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              )}
            </section>
          )}

          {error && !footer && <p role="alert" className="text-body text-destructive">{error}</p>}

          {item.session_label && (
            // Inline text with a no-break space before each dot, so a wrapped line ends on the
            // separator and never starts with one.
            <p className="text-caption [overflow-wrap:anywhere] text-muted">
              <span>Session {sessionLabel(item.session_label)}</span>
              {item.session_branch && (
                <>
                  {" · "}
                  <span className="font-mono">{item.session_branch}</span>
                </>
              )}
              {/* The Proof block links the PR when it renders. */}
              {sessionPr && !card?.pr && (
                <>
                  {" · "}
                  <a href={sessionPr} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {item.pr_repo!.split("/").pop()}#{item.pr_number}
                  </a>
                </>
              )}
            </p>
          )}

          {(liveSessionId || card?.session_link?.session_id) && (
            <SessionNow liveId={liveSessionId} link={card?.session_link ?? null} named={!!item.session_label} />
          )}

          {card?.pr && (
            <ProofBlock
              pr={card.pr}
              reason={card.stage === "done" ? "" : visibleNext(card)}
              mergeLabel={mergeLabelOf(card)}
            />
          )}

          {item.summary && (
            <section aria-label="What it is" className="prose-journal text-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.summary}</ReactMarkdown>
            </section>
          )}
          {item.why && (
            <section aria-label="Why" className="flex flex-col gap-1">
              <h3 className="text-body font-medium text-ink">Why</h3>
              <div className="prose-journal text-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.why}</ReactMarkdown>
              </div>
            </section>
          )}
          {item.repos.length > 0 && <p className="text-caption text-muted">Repos: {item.repos.join(", ")}</p>}
          {item.sources.length > 0 && (
            <section aria-label="Sources" className="flex flex-col gap-1">
              <h3 className="text-body font-medium text-ink">Sources</h3>
              <ul className="flex flex-col gap-1">
                {item.sources.map((url) => (
                  <li key={url} className="min-w-0 truncate text-caption">
                    <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {url.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {item.note && <p className="text-body text-muted">Your note: {item.note}</p>}

          {item.job_id && (
            <div className="flex flex-wrap items-center gap-2">
              {item.job_meta?.pr_url && (
                <a
                  href={item.job_meta.pr_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-body text-primary hover:bg-surface sm:min-h-8"
                >
                  Open PR #{item.job_meta.pr_number} on GitHub
                </a>
              )}
              <Button size="sm" variant="outline" className={BODY_BUTTON} onClick={() => onOpenJob(item.job_id!)}>
                Open the job
              </Button>
              {work && !item.job_meta?.pr_url && <span className="text-caption text-muted">{work}</span>}
            </div>
          )}

          {isOpen && approving && (
            <section aria-label="Approve" className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <label className="flex flex-col gap-1 text-body text-ink">
                Repo for the PR
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  list="backlog-repos"
                  placeholder="e.g. tharpep/sazed"
                  className={field}
                />
                <datalist id="backlog-repos">
                  {[...new Set([...item.repos, ...REPOS])].map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1 text-body text-ink">
                Note for Claude Code (optional)
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Scope it down, pick an approach, things to avoid…"
                  className={cn(field, "resize-y")}
                />
              </label>
              <p className="text-caption text-muted">
                Claude Code starts now on a copy of the repo; the bot opens a PR you review and merge.
              </p>
            </section>
          )}

          {isOpen && !approving && (
            <section aria-label="Priority" className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
              <span className="mr-auto text-body text-ink">
                {item.rank != null ? (
                  <>
                    Priority <span className="font-medium">#{item.rank}</span>
                    <span className="text-muted"> of {Math.max(rankedCount, item.rank)}</span>
                  </>
                ) : (
                  <span className="text-muted">Not prioritized yet</span>
                )}
              </span>
              {item.rank != null ? (
                <>
                  <Button size="sm" variant="ghost" className={BODY_BUTTON} disabled={busy || item.rank === 1} onClick={() => act(() => moveBacklogItem(item.id, 1))}>
                    Top
                  </Button>
                  <Button size="sm" variant="ghost" className={BODY_BUTTON} disabled={busy || item.rank === 1} onClick={() => act(() => moveBacklogItem(item.id, item.rank! - 1))}>
                    Up
                  </Button>
                  <Button size="sm" variant="ghost" className={BODY_BUTTON} disabled={busy || item.rank >= rankedCount} onClick={() => act(() => moveBacklogItem(item.id, item.rank! + 1))}>
                    Down
                  </Button>
                  <Button size="sm" variant="ghost" className={BODY_BUTTON} disabled={busy} onClick={() => act(() => moveBacklogItem(item.id, null))}>
                    Remove
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="ghost" className={BODY_BUTTON} disabled={busy} onClick={() => act(() => moveBacklogItem(item.id, 1))}>
                    Make next
                  </Button>
                  <Button size="sm" variant="outline" className={BODY_BUTTON} disabled={busy} onClick={() => act(() => moveBacklogItem(item.id, 999))}>
                    Prioritize
                  </Button>
                </>
              )}
            </section>
          )}

          {item.status === "dismissed" && (
            <p className="text-caption text-muted">Kept on record so the scout won't suggest it again.</p>
          )}
        </>
      )}
    </DetailPanel>
  );
}
