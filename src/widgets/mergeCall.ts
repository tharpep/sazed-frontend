import type { CardPr, NeedsYouPr } from "@/api/command";
import type { PrSnapshot } from "@/api/projects";

interface MergeCandidate {
  stage: string;
  job_id: string | null;
  pr?: PrSnapshot | NeedsYouPr | CardPr | null;
}

/** A session card Sazed put in Needs me because its PR is ready: open, checks passing and no
 * changes requested (sazed app/board/stages.py, _linked_pr). A worker-job card in Needs me waits
 * for something else, or carries its own actions, so it is never a merge call here. */
export function isMergeCall(card: MergeCandidate): boolean {
  const pr = card.pr;
  return (
    card.job_id == null &&
    card.stage === "needs_me" &&
    pr?.state === "open" &&
    pr.checks?.state === "passing" &&
    pr.review?.verdict !== "request_changes"
  );
}

export type MergeKind = "reviewed" | "unreviewed";

/** Which kind of merge call a card is, by its review alone; null when it is not one. Both kinds
 * can be merged: some PRs need no thorough review. */
export function mergeKind(card: MergeCandidate): MergeKind | null {
  if (!isMergeCall(card)) return null;
  const verdict = card.pr!.review?.verdict;
  return verdict === "approve" || verdict === "approve_with_nits" ? "reviewed" : "unreviewed";
}

export const MERGE_LABEL: Record<MergeKind, string> = {
  reviewed: "Ready to merge · reviewed",
  unreviewed: "Ready to merge · no review",
};

/** "Ready to merge · reviewed" or "Ready to merge · no review"; null when not a merge call. */
export function mergeLabelOf(card: MergeCandidate): string | null {
  const kind = mergeKind(card);
  return kind && MERGE_LABEL[kind];
}

/** Reviewed merge calls ahead of unreviewed ones, each within the slots merge calls already hold,
 * so every other card keeps its place. */
export function orderMergeCalls<T extends MergeCandidate>(cards: readonly T[]): T[] {
  const slots = cards.flatMap((c, i) => (mergeKind(c) ? [i] : []));
  const calls = slots.map((i) => cards[i]);
  const ordered = [...calls.filter((c) => mergeKind(c) === "reviewed"), ...calls.filter((c) => mergeKind(c) === "unreviewed")];
  const out = [...cards];
  slots.forEach((slot, n) => (out[slot] = ordered[n]));
  return out;
}
