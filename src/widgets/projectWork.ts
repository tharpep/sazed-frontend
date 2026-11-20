import type { Project, ProjectCard, SessionLink, Workstream, WorkstreamStatus } from "@/api/projects";

import { mergeLabelOf } from "./mergeCall";

export type CardGroup = "waiting" | "flight" | "todo" | "done";

export const GROUP_ORDER: readonly CardGroup[] = ["waiting", "flight", "todo", "done"];

export const GROUP_NAME: Record<CardGroup, string> = {
  waiting: "Waiting on you",
  flight: "In flight",
  todo: "Not started",
  done: "Done",
};

// Sazed computes these two for nearly every open card, so printing them says nothing.
const SILENT_NEXT = new Set(["Approve it to start", "Being built in a terminal session"]);

export function cardGroup(card: ProjectCard): CardGroup {
  if (card.stage === "needs_me") return "waiting";
  if (card.stage === "doing") return "flight";
  if (card.stage === "done") return "done";
  return "todo";
}

export interface GroupedCards {
  group: CardGroup;
  cards: ProjectCard[];
}

/** A step's cards by state in display order, empty groups left out; ranked cards lead Not started. */
export function groupStepCards(cards: readonly ProjectCard[]): GroupedCards[] {
  const by: Record<CardGroup, ProjectCard[]> = { waiting: [], flight: [], todo: [], done: [] };
  for (const card of cards) by[cardGroup(card)].push(card);
  by.todo.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  return GROUP_ORDER.filter((g) => by[g].length > 0).map((group) => ({ group, cards: by[group] }));
}

const COUNT_WORD: Record<CardGroup, string> = {
  waiting: "waiting on you",
  flight: "in flight",
  todo: "not started",
  done: "done",
};

const COUNT_ORDER: readonly CardGroup[] = ["waiting", "done", "flight", "todo"];

/** "7 done · 18 in flight · 32 not started", with empty states left out. */
export function countLine(groups: readonly GroupedCards[]): string {
  return COUNT_ORDER.flatMap((g) => {
    const n = groups.find((x) => x.group === g)?.cards.length ?? 0;
    return n ? [`${n} ${COUNT_WORD[g]}`] : [];
  }).join(" · ");
}

export type StepEntry =
  | { kind: "fold"; steps: { step: Workstream; index: number }[] }
  | { kind: "step"; step: Workstream; index: number };

/** Steps in order, with a leading run of two or more done steps folded into one entry. */
export function foldSteps(steps: readonly Workstream[]): StepEntry[] {
  let lead = 0;
  while (lead < steps.length && steps[lead].status === "done") lead += 1;
  const entries: StepEntry[] = [];
  if (lead >= 2) entries.push({ kind: "fold", steps: steps.slice(0, lead).map((step, index) => ({ step, index })) });
  steps.forEach((step, index) => {
    if (lead < 2 || index >= lead) entries.push({ kind: "step", step, index });
  });
  return entries;
}

/** "chat-service#129" from a session link, or null when it names no PR. */
export function prRef(link: SessionLink | null | undefined): string | null {
  if (!link?.pr_repo || link.pr_number == null) return null;
  return `${link.pr_repo.split("/").pop()}#${link.pr_number}`;
}

/** A card's PR as "sazed#207": from Sazed's PR snapshot, else the session link, else a worker
 * job's PR number on the card's repo. */
export function cardPrRef(card: ProjectCard): string | null {
  if (card.pr) return `${card.pr.repo.split("/").pop()}#${card.pr.number}`;
  const linked = prRef(card.session_link);
  if (linked) return linked;
  if (card.pr_number != null && card.repo) return `${card.repo.split("/").pop()}#${card.pr_number}`;
  return null;
}

/** A session named by its UUID reads as its first eight characters, as Claude Code shows it. */
export function sessionLabel(session: string): string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(session) ? session.slice(0, 8) : session;
}

/** "Wed 18 Nov, 23:30" in local time. */
export function dayTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day}, ${time}`;
}

/** card.next, unless it is one of Sazed's two stock lines. */
export function visibleNext(card: ProjectCard): string {
  return SILENT_NEXT.has(card.next) ? "" : card.next;
}

/** What a card row says under its title, from fields that exist today. */
export function cardFacts(card: ProjectCard): { text: string; warn: boolean } {
  const group = cardGroup(card);
  const next = visibleNext(card);
  const parts: (string | null)[] = [card.repo];
  if (group === "waiting") parts.push(mergeLabelOf(card) ?? next, card.pr ? cardPrRef(card) : null);
  if (group === "flight") {
    // The PR goes before the session name, so a phone's truncated line keeps it.
    if (card.session_link) parts.push(next, cardPrRef(card), sessionLabel(card.session_link.session));
    else if (card.job_id) parts.push(next);
  }
  if (group === "done") parts.push(card.done_at ? `Done ${dayTime(card.done_at)}` : "Done", cardPrRef(card));
  return { text: parts.filter(Boolean).join(" · "), warn: group === "waiting" };
}

/** Steps that count: dropped ones are left out of every number and every track. */
export function liveSteps(steps: readonly Workstream[]): Workstream[] {
  return steps.filter((w) => w.status !== "dropped");
}

/** Each live step's number, 1 to N by position; a dropped step has none. */
export function stepNumbers(steps: readonly Workstream[]): Map<string, number> {
  return new Map(liveSteps(steps).map((w, i) => [w.id, i + 1]));
}

/** "Step X of N" for the current step, or null when there is none. */
export function stepOf(steps: readonly Workstream[], currentId: string | null): string | null {
  const n = currentId ? stepNumbers(steps).get(currentId) : undefined;
  return n ? `Step ${n} of ${liveSteps(steps).length}` : null;
}

/** The header line: "Step X of N · A of B cards done", then in-flight and waiting counts when set. */
export function projectLine(project: Project): string {
  const { progress, current, workstreams } = project;
  const parts = [
    stepOf(workstreams, current?.id ?? null) ?? `${project.steps_done} of ${liveSteps(workstreams).length} steps done`,
    `${progress.done} of ${progress.total} cards done`,
  ];
  if (progress.in_flight) parts.push(`${progress.in_flight} in flight`);
  if (progress.needs_me) parts.push(`${progress.needs_me} waiting on you`);
  return parts.join(" · ");
}

const STATUS_ORDER: readonly WorkstreamStatus[] = ["done", "in_flight", "needs_me", "next", "blocked", "planned"];
const STATUS_WORD: Record<WorkstreamStatus, string> = {
  done: "done",
  in_flight: "in flight",
  needs_me: "waiting on you",
  next: "next",
  blocked: "blocked",
  planned: "planned",
  dropped: "dropped",
};

/** The step track as words: "Step 6 of 11: 5 done, 1 next, 2 blocked, 3 planned". */
export function trackText(steps: readonly Workstream[], currentId: string | null): string {
  const live = liveSteps(steps);
  const counts = STATUS_ORDER.flatMap((s) => {
    const n = live.filter((w) => w.status === s).length;
    return n ? [`${n} ${STATUS_WORD[s]}`] : [];
  }).join(", ");
  return `${stepOf(steps, currentId) ?? `${live.length} steps`}: ${counts}`;
}
