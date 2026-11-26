import { EmptyState, ListSection } from "@/components/system";
import type { FinanceState, ReviewId } from "../data";
import { ReviewActions } from "../ToCheck";
import { FinanceSheet } from "./FinanceSheet";

interface ReviewSheetProps {
  state: FinanceState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolved: ReviewId[];
  onResolve: (id: ReviewId) => void;
}

export function ReviewSheet({ state, open, onOpenChange, resolved, onResolve }: ReviewSheetProps) {
  const items = state.review.filter((r) => !resolved.includes(r.id));
  return (
    <FinanceSheet title="To check" count={items.length || undefined} open={open} onOpenChange={onOpenChange}>
      {items.length ? (
        <ListSection>
          {items.map((r) => (
            <div key={r.id} className="flex flex-col gap-0.5 px-3 py-3 md:px-4">
              <span className="text-body font-medium text-ink">{r.title}</span>
              <span className="text-meta text-ink-2">{r.detail}</span>
              <ReviewActions item={r} onResolve={onResolve} className="mt-2" />
            </div>
          ))}
        </ListSection>
      ) : (
        <EmptyState title="Nothing to check" />
      )}
      <p className="text-caption text-muted">Sorted this week: {state.sortedThisWeek}.</p>
    </FinanceSheet>
  );
}
