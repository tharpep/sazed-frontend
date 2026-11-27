import type { BacklogItem } from "@/api/backlog";
import type { CardStage, ProjectCard } from "@/api/projects";
import type { SubValue } from "@/store/navStore";

export interface StageInfo {
  id: CardStage;
  name: string;
  say: string;
  none: string;
}

export const STAGES: readonly StageInfo[] = [
  { id: "inbox", name: "Inbox", say: "Not prioritized yet. Prioritize or dismiss.", none: "Nothing to sort. The daily scout and chat add cards here." },
  { id: "next", name: "Next", say: "Ranked. Sazed suggests the order, you approve.", none: "Nothing ranked. Prioritize a card from Inbox." },
  { id: "doing", name: "Doing", say: "Building now.", none: "Nothing building. Approve a card in Next to start one." },
  { id: "needs_me", name: "Needs me", say: "Waiting on you: a PR to merge or a job to rescue.", none: "Nothing needs you." },
  { id: "done", name: "Done", say: "Last 14 days.", none: "Nothing finished in the last 14 days." },
];

export const NEXT_LIMIT = 10;

/** Whether a board row offers its one-click Approve, which starts a worker job at once. A card from
 * a Sazed with plan states never does: approving its plan starts nothing, so its row opens the
 * sheet, where the worker job sits behind Start. */
export function rowStartsJob(card: Pick<ProjectCard, "stage" | "plan_approval">, item: Pick<BacklogItem, "status" | "repos"> | undefined): boolean {
  if (card.plan_approval !== undefined) return false;
  return item !== undefined && (item.status === "new" || item.status === "shortlisted") && item.repos.length === 1 && (card.stage === "inbox" || card.stage === "next");
}

export type StageGroups = Record<CardStage, ProjectCard[]>;

/** Cards under their stage, for the picked type; a job card has no type, so only All shows it. */
export function groupByStage(cards: readonly ProjectCard[], type: SubValue<"work:board.type">): StageGroups {
  const groups: StageGroups = { inbox: [], next: [], doing: [], needs_me: [], done: [] };
  for (const card of cards) {
    if (type !== "all" && card.item_type !== type) continue;
    groups[card.stage]?.push(card);
  }
  // Ranked cards first in rank order; the sort is stable, so the rest keep the server's order.
  groups.next.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  return groups;
}

/** The stage a phone opens on: what waits on Pryce, else what needs sorting, else what is next. */
export function openingStage(groups: StageGroups): CardStage {
  return (["needs_me", "inbox"] as const).find((id) => groups[id].length > 0) ?? "next";
}

/** Next shows its top cards until Pryce asks for the rest. */
export function shownNext(next: readonly ProjectCard[], showAll: boolean): readonly ProjectCard[] {
  return showAll ? next : next.slice(0, NEXT_LIMIT);
}

/** Done cards past the board's 14-day window: done backlog items the board no longer returns. */
export function olderDone(boardCards: readonly ProjectCard[], doneItems: readonly BacklogItem[]): BacklogItem[] {
  const onBoard = new Set(boardCards.map((c) => c.id));
  return doneItems.filter((i) => i.status === "done" && !onBoard.has(itemCardId(i.id)));
}

export const itemCardId = (id: string) => `item:${id}`;

/** The backlog id behind an item card; null for a job card. */
export function backlogId(card: Pick<ProjectCard, "id"> & { kind: string }): string | null {
  return card.kind === "item" ? card.id.slice("item:".length) : null;
}
