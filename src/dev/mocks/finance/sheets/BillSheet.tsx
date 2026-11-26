import type { ReactNode } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { shortDate, type Due, type DueId, type FinanceState, type ReviewId } from "../data";
import { Amount, useMoneyText } from "../Masked";
import { inDays } from "../parts";
import { NotActive } from "../Spending";
import { ReviewActions } from "../ToCheck";
import { Facts } from "./billParts";
import { FinanceSheet } from "./FinanceSheet";

interface Charge {
  date: string;
  amount: number;
  label: string;
}

/** Oldest first. A card statement has no `history` of its own, so it borrows the card's statement figures. */
function pastCharges(state: FinanceState, due: Due): Charge[] {
  if (due.history) return [...due.history].reverse();
  const account = due.card && state.accounts.find((a) => a.id === due.card);
  if (!account) return [];
  return account.history.map((p) => ({ date: p.date, amount: p.value, label: "Statement" }));
}

const CONFIG = {
  paid: { label: "Charged", color: "var(--color-ink-2)" },
  next: { label: "Next", color: "var(--color-primary)" },
} satisfies ChartConfig;

function ChargeChart({ charges, next }: { charges: Charge[]; next: number | null }) {
  const data: { date: string; paid?: number; next?: number }[] = charges.map((c) => ({ date: c.date, paid: c.amount }));
  if (next !== null) data.push({ date: "next", next });
  return (
    <ChartContainer
      config={CONFIG}
      initialDimension={{ width: 340, height: 64 }}
      className="aspect-auto h-16 w-full"
      role="img"
      aria-label="Past charges and the next one"
    >
      <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="28%">
        <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: "var(--color-line)" }} interval={0} className="font-mono" />
        <YAxis hide domain={[0, "dataMax"]} />
        <Bar dataKey="paid" stackId="a" fill="var(--color-paid)" radius={2} isAnimationActive={false} />
        <Bar dataKey="next" stackId="a" fill="var(--color-next)" radius={2} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}

function payment(due: Due, state: FinanceState): string {
  if (due.autopay) return "AutoPay on";
  const scheduled = due.card && state.accounts.find((a) => a.id === due.card)?.due?.scheduled;
  return due.note ?? scheduled ?? "No AutoPay seen";
}

interface BillSheetProps {
  state: FinanceState;
  dueId: DueId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (id: ReviewId) => void;
}

/** Reads review items from `state.review`, so pass the state with resolved items already filtered out. */
export function BillSheet({ state, dueId, open, onOpenChange, onResolve }: BillSheetProps) {
  const money = useMoneyText();
  const due = state.dues.find((d) => d.id === dueId);
  if (!due) return null;
  const card = due.card ? state.accounts.find((a) => a.id === due.card) : undefined;
  const review = due.reviewId ? state.review.find((r) => r.id === due.reviewId) : undefined;
  const charges = pastCharges(state, due);
  const nextAlreadyListed = due.kind === "statement";

  const facts: [string, ReactNode][] = [["Cadence", due.cadence]];
  if (due.via) facts.push(["Paid with", due.via]);
  if (card?.due) facts.push(["Minimum", <Amount key="min" value={card.due.minimum} className="text-meta" />]);
  facts.push(["Payment", payment(due, state)], ["Source", due.source]);

  return (
    <FinanceSheet title={due.name} open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          {due.amount === null ? (
            <span className="font-mono text-heading text-muted">in PDF</span>
          ) : (
            <Amount value={due.amount} approx={due.approx} className="text-heading text-ink" />
          )}
          {due.flag && (
            <Badge variant="secondary" className="rounded-md bg-raised text-caption font-normal text-warn">
              {due.flag.kind === "price" ? `Was ${money(due.flag.was)}` : "New"}
            </Badge>
          )}
        </div>
        <span className="text-meta text-ink-2">
          {shortDate(state.today, due.inDays)}, {inDays(due.inDays)}
        </span>
      </div>

      <Facts rows={facts} />

      {review && (
        <div className="rounded-lg border border-l-2 border-line border-l-warn bg-surface px-3 py-2.5 text-meta">
          <p className="font-medium text-ink">{review.title}</p>
          <p className="mt-0.5 text-ink-2">{review.detail}</p>
          <ReviewActions item={review} onResolve={onResolve} className="mt-2" />
        </div>
      )}

      {charges.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-meta font-medium text-ink">Last amounts</h3>
          <ChargeChart charges={charges} next={nextAlreadyListed ? null : due.amount} />
          <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] gap-x-2.5 gap-y-1 text-meta">
            {charges.slice(-4).reverse().map((c) => (
              <div key={c.date} className="contents">
                <span className="font-mono text-caption text-muted">{c.date}</span>
                <span className="text-ink-2">{c.label}</span>
                <Amount value={c.amount} className="text-right text-meta text-ink" />
              </div>
            ))}
          </div>
        </section>
      )}

      {due.kind === "charge" && <NotActive charges={state.inactive} className="flex" />}
    </FinanceSheet>
  );
}
