import type { PrSnapshot } from "@/api/projects";
import { dayTime } from "@/widgets/projectWork";

// Sazed's poller refreshes a PR at most every 6 minutes, so a snapshot twice that old has missed
// at least one pass.
export const SNAPSHOT_OLD_AFTER_S = 12 * 60;

export type Mark = "done" | "bad" | "wait";

export interface ProofLine {
  key: "pr" | "checks" | "review";
  mark: Mark;
  title: string;
  detail: string;
  value: string;
}

const VERDICT_WORD = new Map([
  ["approve", "approve"],
  ["approve_with_nits", "approve with nits"],
  ["request_changes", "changes requested"],
]);

// The same three conclusions Sazed counts as passed (sazed app/board/prs.py, _PASSED).
const PASSED = new Set(["success", "skipped", "neutral"]);

/** A word Sazed may add later reads as itself, underscores as spaces. */
function plain(word: string): string {
  return word.replace(/_/g, " ");
}

function verdictWord(verdict: string): string {
  return VERDICT_WORD.get(verdict) ?? plain(verdict);
}

/** "sazed-frontend#83". */
export function prName(pr: Pick<PrSnapshot, "repo" | "number">): string {
  return `${pr.repo.split("/").pop()}#${pr.number}`;
}

/** "+1,148 -105", or "" when Sazed has no diff size yet. */
export function diffSize(pr: PrSnapshot): string {
  if (pr.additions == null || pr.deletions == null) return "";
  // A no-break space, so a wrapping line never splits the pair.
  return `+${pr.additions.toLocaleString("en-US")} -${pr.deletions.toLocaleString("en-US")}`;
}

/** Seconds since the snapshot was taken, or null when the PR was never fetched. */
export function snapshotAge(pr: PrSnapshot, now = Date.now()): number | null {
  if (!pr.fetched_at) return null;
  const at = Date.parse(pr.fetched_at);
  return Number.isNaN(at) ? null : Math.max(0, Math.round((now - at) / 1000));
}

/** "25 min old" once the snapshot is past the old mark; "" while it is fresh or never taken. */
export function oldSnapshotText(pr: PrSnapshot, now = Date.now()): string {
  // Sazed fetches a merged or closed PR once more and then never again, so that snapshot is final.
  if (pr.state === "merged" || pr.state === "closed") return "";
  const age = snapshotAge(pr, now);
  if (age === null || age <= SNAPSHOT_OLD_AFTER_S) return "";
  if (age < 3600) return `${Math.floor(age / 60)} min old`;
  if (age < 86_400) return `${Math.floor(age / 3600)}h old`;
  return `${Math.floor(age / 86_400)}d old`;
}

function prLine(pr: PrSnapshot): ProofLine {
  const base = { key: "pr" as const, title: `PR ${prName(pr)}`, value: diffSize(pr) };
  switch (pr.state) {
    case "merged":
      return { ...base, mark: "done", detail: pr.merged_at ? `Merged ${dayTime(pr.merged_at)}` : "Merged" };
    case "closed":
      return { ...base, mark: "bad", detail: "Closed without merging" };
    case "draft":
      return { ...base, mark: "wait", detail: "Draft" };
    case "open":
      return { ...base, mark: "wait", detail: "Open" };
    default:
      return { ...base, mark: "wait", detail: plain(pr.state) };
  }
}

function checksLine(pr: PrSnapshot): ProofLine {
  const base = { key: "checks" as const, title: "Checks" };
  const c = pr.checks;
  if (!c) return { ...base, mark: "wait", detail: "Not fetched yet", value: "" };
  if (c.state === "none" || c.total === 0) return { ...base, mark: "wait", detail: "No checks reported", value: "" };
  const failing = c.runs.filter((r) => r.conclusion && !PASSED.has(r.conclusion));
  const running = c.runs.filter((r) => !r.conclusion);
  const detail =
    c.state === "failing" && failing.length
      ? `Failing: ${failing.map((r) => r.name).join(", ")}`
      : c.state === "running" && running.length
        ? `Running: ${running.map((r) => r.name).join(", ")}`
        : c.runs.map((r) => r.name).join(", ");
  const mark: Mark = c.state === "passing" ? "done" : c.state === "failing" ? "bad" : "wait";
  const known = ["passing", "failing", "running"].includes(c.state);
  return { ...base, mark, detail: known ? detail : [plain(c.state), detail].filter(Boolean).join(": "), value: `${c.passed} of ${c.total}` };
}

function reviewLine(pr: PrSnapshot): ProofLine {
  const r = pr.review;
  if (!r) return { key: "review", mark: "wait", title: "Review", detail: "No review stored", value: "" };
  return {
    key: "review",
    mark: r.verdict === "request_changes" ? "bad" : VERDICT_WORD.has(r.verdict) ? "done" : "wait",
    title: `${r.source ?? "Unnamed"} review`,
    detail: "",
    value: verdictWord(r.verdict),
  };
}

/** The Proof block's three lines: the PR, its checks, its review. */
export function proofLines(pr: PrSnapshot): ProofLine[] {
  return [prLine(pr), checksLine(pr), reviewLine(pr)];
}

function checksSentence(pr: PrSnapshot): string {
  const c = pr.checks;
  if (!c) return "Checks not fetched yet";
  if (c.state === "none" || c.total === 0) return "No checks reported";
  if (c.state === "running") return `Checks running, ${c.passed} of ${c.total} passed`;
  return `Checks ${c.passed} of ${c.total} passed`;
}

// Sazed allows a 120-character source; past this a phone line would push the verdict out of view.
export const SOURCE_MAX = 32;

/** The reviewer as Sazed sends it, cut with an ellipsis past SOURCE_MAX characters. */
export function shortSource(source: string | null): string {
  const chars = Array.from(source ?? "Unnamed");
  return chars.length > SOURCE_MAX ? `${chars.slice(0, SOURCE_MAX - 1).join("").trimEnd()}…` : chars.join("");
}

/** "agy review: approve. Checks 6 of 6 passed. +412 -88." for a merge call in Needs you; only the
 * reviewer is ever shortened, never the verdict, checks or diff. */
export function mergeCallLine(pr: PrSnapshot): string {
  const review = pr.review ? `${shortSource(pr.review.source)} review: ${verdictWord(pr.review.verdict)}` : "No review";
  const diff = diffSize(pr);
  return [review, checksSentence(pr), diff].filter(Boolean).join(". ") + ".";
}
