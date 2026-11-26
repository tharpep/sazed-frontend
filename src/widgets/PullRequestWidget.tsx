import type { CardPr, PullRequestView } from "@/api/command";
import { diffSize, oldSnapshotText, PASSED, prName, shortSource, verdictWord } from "@/features/backlog/proof";

import { CardAnswer, CardFrame, CardHeader, LabelRow, Num } from "./card/frame";
import { consoleLink, githubLink } from "./card/links";
import { CardActions, Pill, Square, Squares, StackedMeter, type Tone } from "./card/marks";
import { mergeLabelOf } from "./mergeCall";
import { dayTime } from "./projectWork";

// The size bar is logarithmic and full at this many changed lines, so a 500-line PR fills about
// four fifths of it, as in the H mockup, and a 20-line fix still shows as small.
const SIZE_FULL = 2000;

const STAGE_WORD: Record<string, string> = {
  inbox: "inbox",
  next: "next",
  doing: "doing",
  needs_me: "needs you",
  done: "done",
};

const plain = (word: string) => word.replace(/_/g, " ");
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function runTone(conclusion: string | null): Tone {
  if (!conclusion) return "info";
  return PASSED.has(conclusion) ? "ok" : "err";
}

function cardOf(card: PullRequestView) {
  return { stage: card.stage, job_id: card.job_id, pr: card.pr };
}

/** The verdict line, split at its first " · " into the answer and a muted tail. */
export function prVerdict(card: PullRequestView, pr: CardPr): [string, string | undefined] {
  const label =
    mergeLabelOf(cardOf(card)) ??
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
                : sentence(plain(pr.state)));
  const at = label.indexOf(" · ");
  return at < 0 ? [label, undefined] : [label.slice(0, at), label.slice(at + 3)];
}

/** The header pill: one word for where the PR stands. */
export function prPill(card: PullRequestView, pr: CardPr): { tone?: Tone; word: string } {
  if (mergeLabelOf(cardOf(card))) return { tone: "ok", word: "ready" };
  if (pr.state === "merged") return { tone: "ok", word: "merged" };
  if (pr.state === "closed") return { word: "closed" };
  if (pr.state === "draft") return { word: "draft" };
  if (pr.review?.verdict === "request_changes") return { tone: "warn", word: "changes requested" };
  if (pr.checks?.state === "failing") return { tone: "err", word: "failing" };
  if (pr.checks?.state === "running") return { tone: "info", word: "running" };
  return { word: plain(pr.state) };
}

/** The bar's share of the track for a diff of this many lines. */
export function sizeShare(lines: number): number {
  return Math.min(1, Math.log10(lines + 1) / Math.log10(SIZE_FULL + 1));
}

function Checks({ pr }: { pr: CardPr }) {
  const c = pr.checks;
  if (!c) return <LabelRow label="Checks"><span className="text-[12px] text-card-ink-3">not fetched yet</span></LabelRow>;
  if (c.state === "none" || c.total === 0 || !c.runs.length) {
    return <LabelRow label="Checks"><span className="text-[12px] text-card-ink-3">none reported</span></LabelRow>;
  }
  const failing = c.runs.filter((r) => r.conclusion && !PASSED.has(r.conclusion)).map((r) => r.name);
  const running = c.runs.filter((r) => !r.conclusion).map((r) => r.name);
  const named = [failing.length && `Failing: ${failing.join(", ")}`, running.length && `Running: ${running.join(", ")}`].filter(Boolean).join(" · ");
  return (
    <>
      <LabelRow
        label="Checks"
        value={
          <Num className={c.state === "failing" ? "text-card-err" : undefined}>
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
      {named && <div className="pb-1 pl-[66px] text-[12px] [overflow-wrap:anywhere] text-card-ink-3">{named}</div>}
    </>
  );
}

function Size({ pr }: { pr: CardPr }) {
  const size = diffSize(pr);
  if (!size) return null;
  const lines = pr.additions! + pr.deletions!;
  const filled = sizeShare(lines);
  return (
    <LabelRow label="Size" value={<Num>{size}</Num>}>
      <StackedMeter
        parts={[
          { share: lines ? (filled * pr.additions!) / lines : 0, tone: "ok" },
          { share: lines ? (filled * pr.deletions!) / lines : 0, tone: "err" },
        ]}
      />
    </LabelRow>
  );
}

function Review({ pr }: { pr: CardPr }) {
  return (
    <LabelRow label="Review">
      <span className="block truncate text-[12px] text-card-ink-3">
        {pr.review ? `${verdictWord(pr.review.verdict)} · ${shortSource(pr.review.source)}` : "none yet"}
      </span>
    </LabelRow>
  );
}

/** One board card's pull request: can it merge, how big is it, what checked it. With no PR, the card itself. */
export function PullRequestWidget(card: PullRequestView) {
  const pr = card.pr;
  const toConsole = card.open_url ? [consoleLink("Open in console", card.open_url)] : [];

  if (!pr) {
    return (
      <CardFrame>
        <CardHeader right={card.job_status ? <Pill>{plain(card.job_status)}</Pill> : undefined}>
          {[card.repo?.split("/").pop(), STAGE_WORD[card.stage] ?? plain(card.stage)].filter(Boolean).join(" · ")}
        </CardHeader>
        <CardAnswer tail="no pull request yet">{card.title}</CardAnswer>
        {card.next && (
          <LabelRow label="Next">
            <span className="block [overflow-wrap:anywhere] text-[13px] text-card-ink-2">{card.next}</span>
          </LabelRow>
        )}
        <CardActions links={toConsole} />
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
            {pill.word !== plain(pr.state) && <Pill tone={pill.tone}>{pill.word}</Pill>}
          </>
        }
      >
        {prName(pr)} · {plain(pr.state)}
      </CardHeader>
      <CardAnswer tail={tail}>{verdict}</CardAnswer>
      <div className="mb-2 truncate" title={card.title}>
        {card.title}
      </div>
      <Checks pr={pr} />
      <Size pr={pr} />
      <Review pr={pr} />
      <CardActions links={[githubLink("Open PR", pr.url), ...toConsole]} />
    </CardFrame>
  );
}
