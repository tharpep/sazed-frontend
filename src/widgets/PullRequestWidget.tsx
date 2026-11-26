import type { PullRequestView } from "@/api/command";
import type { PrSnapshot } from "@/api/projects";
import { diffSize, oldSnapshotText, PASSED, prName, proofLines } from "@/features/backlog/proof";

import { CardAnswer, CardFrame, CardHeader, LabelRow, Num } from "./card/frame";
import { CardActions, Pill, Square, Squares, StackedMeter, TONE_TEXT, type Tone } from "./card/marks";
import { mergeLabelOf } from "./mergeCall";
import { dayTime } from "./projectWork";

// A diff this many lines long fills the size bar; a bigger one fills it too.
export const SIZE_FULL = 1000;

const STAGE_WORD: Record<PullRequestView["stage"], string> = {
  inbox: "inbox",
  next: "next",
  doing: "doing",
  needs_me: "needs you",
  done: "done",
};

function runTone(conclusion: string | null): Tone {
  if (!conclusion) return "info";
  return PASSED.has(conclusion) ? "ok" : "err";
}

const CHECKS_TONE: Record<string, Tone> = { passing: "ok", failing: "err", running: "info" };

/** The verdict line, split at its first " · " into the answer and a muted tail. */
export function prVerdict(card: PullRequestView, pr: PrSnapshot): [string, string | undefined] {
  const label =
    mergeLabelOf(card) ??
    (pr.state === "merged"
      ? `Merged${pr.merged_at ? ` · ${dayTime(pr.merged_at)}` : ""}`
      : pr.state === "closed"
        ? "Closed without merging"
        : pr.state === "draft"
          ? "Draft"
          : pr.review?.verdict === "request_changes"
            ? "Changes requested"
            : pr.checks?.state === "failing"
              ? "Checks failing"
              : pr.checks?.state === "running"
                ? "Checks running"
                : pr.state === "open"
                  ? "Open"
                  : pr.state.replace(/_/g, " "));
  const at = label.indexOf(" · ");
  return at < 0 ? [label, undefined] : [label.slice(0, at), label.slice(at + 3)];
}

/** The header pill: one word for where the PR stands. */
export function prPill(card: PullRequestView, pr: PrSnapshot): { tone?: Tone; word: string } {
  if (mergeLabelOf(card)) return { tone: "ok", word: "ready" };
  if (pr.state === "merged") return { tone: "ok", word: "merged" };
  if (pr.state === "closed") return { word: "closed" };
  if (pr.state === "draft") return { word: "draft" };
  if (pr.review?.verdict === "request_changes") return { tone: "warn", word: "changes requested" };
  if (pr.checks?.state === "failing") return { tone: "err", word: "failing" };
  if (pr.checks?.state === "running") return { tone: "info", word: "running" };
  return { word: pr.state.replace(/_/g, " ") };
}

function Checks({ pr }: { pr: PrSnapshot }) {
  const c = pr.checks;
  if (!c) return <LabelRow label="Checks"><span className="text-[12px] text-card-ink-3">not fetched yet</span></LabelRow>;
  if (c.state === "none" || c.total === 0 || !c.runs.length) {
    return <LabelRow label="Checks"><span className="text-[12px] text-card-ink-3">none reported</span></LabelRow>;
  }
  return (
    <LabelRow
      label="Checks"
      value={
        <Num className={TONE_TEXT[CHECKS_TONE[c.state] ?? "info"]}>
          {c.passed}/{c.total}
        </Num>
      }
    >
      <Squares>
        {c.runs.map((run, i) => (
          <Square key={i} tone={runTone(run.conclusion)} title={`${run.name}: ${run.conclusion ?? "running"}`} />
        ))}
      </Squares>
    </LabelRow>
  );
}

function Size({ pr }: { pr: PrSnapshot }) {
  const size = diffSize(pr);
  if (!size) return null;
  const scale = Math.max(SIZE_FULL, pr.additions! + pr.deletions!);
  return (
    <LabelRow label="Size" value={<Num>{size}</Num>}>
      <StackedMeter
        parts={[
          { share: pr.additions! / scale, tone: "ok" },
          { share: pr.deletions! / scale, tone: "err" },
        ]}
      />
    </LabelRow>
  );
}

function Review({ pr }: { pr: PrSnapshot }) {
  const line = proofLines(pr).find((l) => l.key === "review")!;
  return (
    <LabelRow label="Review">
      <span className="block truncate text-[12px] text-card-ink-3">{pr.review ? `${line.title}: ${line.value}` : "none yet"}</span>
    </LabelRow>
  );
}

/** One board card's pull request: can it merge, how big is it, what checked it. With no PR, the card itself. */
export function PullRequestWidget(card: PullRequestView) {
  const pr = card.pr;
  const consoleLink = card.open_url ? [{ label: "Open in console", href: card.open_url }] : [];

  if (!pr) {
    return (
      <CardFrame>
        <CardHeader right={card.job_status ? <Pill>{card.job_status.replace(/_/g, " ")}</Pill> : undefined}>
          {[card.repo?.split("/").pop(), STAGE_WORD[card.stage]].filter(Boolean).join(" · ")}
        </CardHeader>
        <CardAnswer tail="no pull request yet">{card.title}</CardAnswer>
        {card.next && (
          <LabelRow label="Next">
            <span className="block [overflow-wrap:anywhere] text-[13px] text-card-ink-2">{card.next}</span>
          </LabelRow>
        )}
        <CardActions links={consoleLink} />
      </CardFrame>
    );
  }

  const [verdict, tail] = prVerdict(card, pr);
  const pill = prPill(card, pr);
  const old = oldSnapshotText(pr);
  return (
    <CardFrame>
      <CardHeader
        right={
          <>
            {old && <span className="text-card-warn">{old}</span>}
            <Pill tone={pill.tone}>{pill.word}</Pill>
          </>
        }
      >
        {prName(pr)} · {pr.state.replace(/_/g, " ")}
      </CardHeader>
      <CardAnswer tail={tail}>{verdict}</CardAnswer>
      <div className="mb-2 truncate" title={card.title}>
        {card.title}
      </div>
      <Checks pr={pr} />
      <Size pr={pr} />
      <Review pr={pr} />
      <CardActions links={[{ label: "Open PR", href: pr.url }, ...consoleLink]} />
    </CardFrame>
  );
}
