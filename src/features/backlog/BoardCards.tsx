import type { ReactNode } from "react";

import { SwipeRow } from "@/components/shell/SwipeRow";
import type { CardStage } from "@/api/projects";
import { cn } from "@/lib/utils";

/** One card as the board draws it, from a board card or from an older or dismissed backlog item. */
export interface CardView {
  key: string;
  title: string;
  next: string;
  meta: string;
  place: CardStage | "older" | "dismissed";
  rank: number | null;
  failed: boolean;
  onOpen: () => void;
  onApprove?: () => void;
  onDismiss?: () => void;
}

function Glyph({ card }: { card: CardView }) {
  if (card.place === "next" && card.rank != null) return <>{card.rank}</>;
  if (card.place === "doing")
    return (
      <span
        aria-label="Building"
        className="block size-[11px] rounded-full border-[1.5px] border-line border-t-ink motion-safe:animate-spin"
      />
    );
  if (card.place === "needs_me")
    return card.failed ? (
      <span aria-label="Failed" className="font-mono text-[15px] leading-5 font-medium text-err">
        !
      </span>
    ) : (
      <span aria-label="Needs you" className="block size-[9px] rounded-full border-[1.5px] border-warn" />
    );
  return null;
}

const quiet = (card: CardView) => card.place === "done" || card.place === "older";

function titleClass(card: CardView) {
  if (card.place === "dismissed") return "font-normal text-muted line-through decoration-line";
  return quiet(card) ? "font-normal text-ink-2" : "font-medium text-ink";
}

function swipeable(card: CardView, content: ReactNode) {
  // Only a card that can still be dismissed swipes; a swipe on approved or done work would dismiss it.
  return card.onDismiss ? <SwipeRow onSwipeLeft={card.onDismiss}>{content}</SwipeRow> : content;
}

/** A card as a list row: the stage-bar layout below 1100px. */
export function CardRow({ card, acting }: { card: CardView; acting: boolean }) {
  return swipeable(
    card,
    <div className="flex items-start rounded-[10px] transition-colors hover:bg-surface">
      <button
        type="button"
        onClick={card.onOpen}
        className="grid min-h-14 min-w-0 flex-1 grid-cols-[22px_minmax(0,1fr)] items-start gap-x-2.5 px-1 py-2.5 text-left"
      >
        <span className="flex h-5 items-center justify-center font-mono text-meta leading-5 text-muted">
          <Glyph card={card} />
        </span>
        <span className="min-w-0">
          <span className={cn("line-clamp-2 text-body [overflow-wrap:anywhere]", titleClass(card))}>{card.title}</span>
          <span className="mt-0.5 block text-meta text-ink-2">{card.next}</span>
          <span className="mt-0.5 block truncate text-caption text-muted">{card.meta}</span>
        </span>
      </button>
      {card.onApprove && (
        <button
          type="button"
          disabled={acting}
          onClick={card.onApprove}
          className="mr-1 ml-2.5 min-h-11 min-w-11 flex-none self-center rounded-[9px] border border-line bg-surface px-3 text-meta text-primary transition-colors hover:bg-raised disabled:opacity-50"
        >
          Approve
        </button>
      )}
    </div>
  );
}

/** A card as a column tile: the five-column layout from 1100px. */
export function CardTile({ card, acting }: { card: CardView; acting: boolean }) {
  const glyph = card.place === "next" ? card.rank != null : card.place === "doing" || card.place === "needs_me";
  return swipeable(
    card,
    <div className="relative rounded-lg border border-line bg-surface transition-colors hover:border-muted/50">
      <button
        type="button"
        onClick={card.onOpen}
        className={cn(
          "grid w-full items-start gap-x-2 px-2.5 pt-[9px] pb-2.5 text-left",
          glyph ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1"
        )}
      >
        {glyph && (
          <span className="flex h-5 min-w-3.5 items-center justify-center font-mono text-meta leading-5 text-muted">
            <Glyph card={card} />
          </span>
        )}
        <span className="min-w-0">
          <span className={cn("line-clamp-3 text-body [overflow-wrap:anywhere]", titleClass(card))}>{card.title}</span>
          <span className="mt-[3px] block text-meta text-ink-2">{card.next}</span>
          <span
            className={cn(
              "mt-1.5 flex min-w-0 items-center text-caption text-muted",
              card.onApprove && "min-h-6 pr-[76px]"
            )}
          >
            <span className="truncate">{card.meta}</span>
          </span>
        </span>
      </button>
      {card.onApprove && (
        <button
          type="button"
          disabled={acting}
          onClick={card.onApprove}
          className="absolute right-2.5 bottom-2.5 h-6 rounded-[7px] border border-line bg-surface px-2 text-caption text-primary transition-colors hover:bg-raised disabled:opacity-50"
        >
          Approve
        </button>
      )}
    </div>
  );
}
