import { useState } from "react";

import { ListRow, ListSection } from "@/components/system";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { shortDate, type Due, type ReviewItem } from "./data";
import { Amount, useMoneyText } from "./Masked";
import { CheckRing, inDays, inDaysShort, SectionHead } from "./parts";
import { useOpenSheet } from "./sheets/openSheet";
import { ReviewActions } from "./ToCheck";

const TICKS = [0, 7, 14, 21, 28];

/** Plain positioned divs: marks sit at a day offset, which a Recharts axis adds nothing to. */
function Timeline({ dues, days, today, open }: { dues: Due[]; days: number; today: string; open: Set<string> }) {
  const at = (n: number) => `${(n / days) * 100}%`;
  const ticks = TICKS.filter((t) => t <= days);
  return (
    <div className="relative h-16" role="img" aria-label={`Due in the next ${days} days`}>
      <span className="absolute inset-x-0 top-10 h-px bg-line" />
      <span className="absolute top-0.5 bottom-5.5 left-0 w-px bg-primary" />
      {dues.map((d) => (
        <span
          key={d.id}
          style={{ left: at(d.inDays) }}
          className={cn(
            "absolute w-2 -translate-x-1/2 rounded-sm",
            d.kind === "charge" ? "top-7 h-3 bg-ink-2/40" : "top-2.5 h-7.5 bg-ink-2",
            d.reviewId && open.has(d.reviewId) && "outline-[1.5px] outline-offset-1 outline-warn"
          )}
        />
      ))}
      {ticks.map((t, i) => (
        <span
          key={t}
          style={{ left: at(t) }}
          className={cn(
            "absolute top-11.5 font-mono text-caption whitespace-nowrap text-muted",
            i === 0 ? "" : t === days ? "-translate-x-full" : "-translate-x-1/2"
          )}
        >
          {t === 0 ? "today" : shortDate(today, t)}
        </span>
      ))}
    </div>
  );
}

function DueRow({ due, needsCheck, attached, onResolve }: {
  due: Due;
  needsCheck: boolean;
  attached?: ReviewItem;
  onResolve: (id: ReviewItem["id"]) => void;
}) {
  const money = useMoneyText();
  const openSheet = useOpenSheet();
  return (
    <div>
      <ListRow
        onClick={() => openSheet({ kind: "bill", id: due.id })}
        leading={needsCheck && <CheckRing />}
        title={<span className={due.card ? undefined : "font-normal"}>{due.name}</span>}
        description={due.card ? due.note : due.via}
        detail={
          due.flag && (
            <Badge variant="secondary" className="mt-1 rounded-md bg-raised text-caption font-normal text-warn">
              {due.flag.kind === "price" ? `Was ${money(due.flag.was)}` : "New"}
            </Badge>
          )
        }
        meta={
          <>
            {due.amount === null ? (
              <span className="font-mono text-body text-muted">in PDF</span>
            ) : (
              <Amount plain value={due.amount} approx={due.approx} className="text-body text-ink" />
            )}
            <span className={due.inDays <= 7 ? "text-ink-2" : undefined}>
              <span className="md:hidden">{inDaysShort(due.inDays)}</span>
              <span className="hidden md:inline">{inDays(due.inDays)}</span>
            </span>
          </>
        }
      />
      {attached && (
        <div className="mx-3 mb-3 ml-11 rounded-lg border border-l-2 border-line border-l-warn bg-bg px-3 py-2.5 text-meta md:mr-4 md:ml-12">
          <p className="font-medium text-ink">{attached.title}</p>
          <p className="mt-0.5 text-ink-2">{attached.fact}</p>
          <ReviewActions item={attached} onResolve={onResolve} className="mt-2" />
        </div>
      )}
    </div>
  );
}

interface DueSectionProps {
  days: number;
  dues: Due[];
  /** Rows shown before "N more"; review items attach only to these, so the rest stay in To check. */
  initial: number;
  today: string;
  review: ReviewItem[];
  onResolve: (id: ReviewItem["id"]) => void;
  className?: string;
}

export function DueSection({ days, dues, initial, today, review, onResolve, className }: DueSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const inRange = dues.filter((d) => d.inDays <= days);
  const shown = expanded ? inRange : inRange.slice(0, initial);
  const hidden = inRange.length - shown.length;
  const open = new Set(review.map((r) => r.id));
  return (
    <section className={cn("flex-col gap-3", className)}>
      <SectionHead title={`Due in ${days} days`} count={inRange.length} />
      <Timeline dues={inRange} days={days} today={today} open={open} />
      <ListSection>
        {shown.map((d, i) => (
          <DueRow
            key={d.id}
            due={d}
            needsCheck={d.reviewId !== undefined && open.has(d.reviewId)}
            attached={i < initial ? review.find((r) => r.id === d.reviewId) : undefined}
            onResolve={onResolve}
          />
        ))}
        {hidden > 0 && (
          <ListRow title={<span className="font-normal text-ink-2">{hidden} more</span>} onClick={() => setExpanded(true)} />
        )}
      </ListSection>
    </section>
  );
}
