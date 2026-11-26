import type { NeedsYouItem, NeedsYouView } from "@/api/command";
import { diffSize } from "@/features/backlog/proof";

import { CardAnswer, CardFrame, CardHeader, CardSection, MoreLine, Num, TightRow } from "./card/frame";
import { CardActions, Callout, Dot } from "./card/marks";
import { mergeKind, mergeLabelOf, orderMergeCalls } from "./mergeCall";
import { dayTime } from "./projectWork";

export const MERGE_ROWS = 4;
export const OTHER_ROWS = 3;
const RUNNING_NAMED = 2;

function candidate(item: NeedsYouItem) {
  return { stage: item.stage ?? "", job_id: item.job_id ?? null, pr: item.pr };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "49m", "3h 50m"; under a minute reads "<1m". */
export function elapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Splits the needs list the way Home reads it: questions, merge calls in Home's order, the rest. */
export function needsParts(needs: readonly NeedsYouItem[]) {
  const questions = needs.filter((n) => n.question);
  const merges = orderMergeCalls(needs.filter((n) => !n.question).map((n) => ({ ...candidate(n), item: n })))
    .filter((c) => mergeKind(c))
    .map((c) => c.item);
  const others = needs.filter((n) => !n.question && !merges.includes(n));
  return { questions, merges, others };
}

/** "1 question, 14 PRs ready to merge, 2 other items". */
export function needsAnswer(parts: ReturnType<typeof needsParts>): string {
  return [
    parts.questions.length && plural(parts.questions.length, "question", "questions"),
    parts.merges.length && `${plural(parts.merges.length, "PR", "PRs")} ready to merge`,
    parts.others.length && plural(parts.others.length, "other item", "other items"),
  ]
    .filter(Boolean)
    .join(", ");
}

/** What is waiting on Pryce: the first question in full, merge calls with checks and size, what is running. */
export function NeedsYouWidget({ needs, needs_total, working, done, session_count, open_url }: NeedsYouView) {
  const total = Math.max(needs_total ?? 0, needs.length);
  const parts = needsParts(needs);
  const [question, ...laterQuestions] = parts.questions;
  const rest = [...laterQuestions, ...parts.others];
  const reviewed = parts.merges.filter((n) => mergeKind(candidate(n)) === "reviewed").length;
  const unsent = total - needs.length;
  const running = working.length + (session_count ?? 0);
  const doneLine = `${done.succeeded} done${done.failed ? `, ${done.failed} failed` : ""} in ${done.window_hours ?? 24}h`;

  return (
    <CardFrame>
      <CardHeader right={total ? <Num>{total}</Num> : undefined}>Needs you</CardHeader>
      {total ? <CardAnswer>{needsAnswer(parts) || plural(total, "item", "items")}</CardAnswer> : <CardAnswer tail={doneLine}>Nothing needs you</CardAnswer>}

      {question && (
        <Callout sub={[question.title, question.repo, question.updated_at && dayTime(question.updated_at)].filter(Boolean).join(" · ")}>
          {question.question}
        </Callout>
      )}

      {rest.slice(0, OTHER_ROWS).map((item) => (
        <TightRow key={item.id}>
          <Dot tone={item.question ? "warn" : "info"} />
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          {item.next && <span className="max-w-[40%] truncate text-[12px] text-card-ink-3">{item.next}</span>}
        </TightRow>
      ))}
      {rest.length > OTHER_ROWS && <MoreLine>+{rest.length - OTHER_ROWS} more waiting</MoreLine>}

      {parts.merges.length > 0 && (
        <>
          <CardSection right="checks · size">Ready to merge</CardSection>
          {parts.merges.slice(0, MERGE_ROWS).map((item) => (
            <TightRow key={item.id} title={mergeLabelOf(candidate(item)) ?? undefined}>
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <Num className="text-card-ok">
                {item.pr!.checks!.passed}/{item.pr!.checks!.total}
              </Num>
              <Num className="w-[88px] flex-none text-right text-card-ink-3">{diffSize(item.pr!)}</Num>
            </TightRow>
          ))}
          <MoreLine>
            {[
              parts.merges.length > MERGE_ROWS && `+${parts.merges.length - MERGE_ROWS} more`,
              `${reviewed} reviewed, ${parts.merges.length - reviewed} no review`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </MoreLine>
        </>
      )}
      {unsent > 0 && <MoreLine>+{unsent} more not listed here</MoreLine>}

      {running > 0 && (
        <div className="mt-1 truncate border-t border-card-line pt-1.5 text-[12px] text-card-ink-3">
          Running: {running}
          {working.slice(0, RUNNING_NAMED).map((job, i) => (
            <span key={i}>
              {i ? ", " : " · "}
              {job.title} <Num>{elapsed(job.elapsed_s)}</Num>
            </span>
          ))}
          {session_count ? `${working.length ? ", " : " · "}${plural(session_count, "session", "sessions")}` : ""}
        </div>
      )}
      <CardActions links={open_url ? [{ label: "Open Home", href: open_url }] : []} />
    </CardFrame>
  );
}
