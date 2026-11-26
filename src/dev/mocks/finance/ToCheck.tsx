import { ListSection } from "@/components/system";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReviewItem } from "./data";
import { SectionHead } from "./parts";

export function ReviewActions({ item, onResolve, className }: {
  item: ReviewItem;
  onResolve: (id: ReviewItem["id"]) => void;
  className?: string;
}) {
  const [first, second] = item.actions;
  return (
    <div className={cn("flex gap-2", className)}>
      <Button variant="outline" className="h-11 flex-1 text-meta md:h-8 md:flex-none" onClick={() => onResolve(item.id)}>
        {first}
      </Button>
      <Button variant="ghost" className="h-11 flex-1 text-meta md:h-8 md:flex-none" onClick={() => onResolve(item.id)}>
        {second}
      </Button>
    </div>
  );
}

interface ToCheckProps {
  items: ReviewItem[];
  onResolve: (id: ReviewItem["id"]) => void;
  className?: string;
}

export function ToCheck({ items, onResolve, className }: ToCheckProps) {
  if (!items.length) return null;
  return (
    <section className={cn("flex-col gap-3", className)}>
      <SectionHead title="To check" count={items.length} />
      <ListSection>
        {items.map((r) => (
          <div key={r.id} className="flex flex-col gap-0.5 px-3 py-3 md:px-4">
            <span className="text-body font-medium text-ink">{r.title}</span>
            <span className="text-meta text-ink-2">{r.fact}</span>
            <ReviewActions item={r} onResolve={onResolve} className="mt-2" />
          </div>
        ))}
      </ListSection>
    </section>
  );
}
