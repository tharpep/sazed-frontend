import { Line, LineChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { useOpenSheet } from "./sheets/openSheet";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CardSpend, FinanceState, InactiveCharge, Purchase, Spending as SpendingData } from "./data";
import { Amount, useMoneyText } from "./Masked";
import { Fold, SectionHead } from "./parts";

const CONFIG = {
  now: { label: "This month", color: "var(--color-primary)" },
  last: { label: "Last month", color: "var(--color-muted)" },
} satisfies ChartConfig;

function SpendChart({ spending }: { spending: SpendingData }) {
  const todayIndex = spending.nowDaily.length - 1;
  const lastDay = spending.lastDaily.length - 1;
  const data = spending.lastDaily.map((last, day) => ({ day, last, now: spending.nowDaily[day] }));
  const label: Record<number, string> = { 0: "1st", [todayIndex]: "today", [lastDay]: "31st" };
  return (
    <ChartContainer
      config={CONFIG}
      initialDimension={{ width: 400, height: 96 }}
      className="aspect-auto h-24 w-full"
      role="img"
      aria-label="Card spending this month against last"
    >
      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 8 }}>
        <XAxis
          dataKey="day"
          type="number"
          domain={[0, lastDay]}
          ticks={[0, todayIndex, lastDay]}
          tickFormatter={(d: number) => label[d] ?? ""}
          tickLine={false}
          axisLine={{ stroke: "var(--color-line)" }}
          className="font-mono"
        />
        <YAxis hide domain={[0, "dataMax"]} />
        <Line dataKey="last" type="linear" isAnimationActive={false} stroke="var(--color-last)" strokeWidth={1.4} strokeDasharray="4 3" dot={false} activeDot={false} />
        <Line dataKey="now" type="linear" isAnimationActive={false} stroke="var(--color-now)" strokeWidth={1.8} dot={false} activeDot={false} connectNulls={false} />
      </LineChart>
    </ChartContainer>
  );
}

function CardTable({ rows, head, total }: { rows: CardSpend[]; head: [string, string, string]; total?: boolean }) {
  return (
    <Table className="text-meta">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-0 text-caption">{head[0]}</TableHead>
          <TableHead className="text-right text-caption">{head[1]}</TableHead>
          <TableHead className="pr-0 text-right text-caption">{head[2]}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.card} className="hover:bg-transparent">
            <TableCell className="pl-0 text-ink">{r.card}</TableCell>
            <TableCell className="text-right">
              <Amount value={r.last} className="text-meta text-ink-2" />
            </TableCell>
            <TableCell className="pr-0 text-right">
              <Amount value={r.now} className="text-meta text-ink" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {total && (
        <TableFooter className="bg-transparent">
          <TableRow className="hover:bg-transparent">
            <TableCell className="pl-0 text-ink">Total</TableCell>
            <TableCell className="text-right">
              <Amount value={rows.reduce((s, r) => s + r.last, 0)} className="text-meta text-ink" />
            </TableCell>
            <TableCell className="pr-0 text-right">
              <Amount value={rows.reduce((s, r) => s + r.now, 0)} className="text-meta text-ink" />
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}

export function Spending({ state, className }: { state: FinanceState; className?: string }) {
  const { spending } = state;
  const openSheet = useOpenSheet();
  if (!spending) {
    return (
      <section className={cn("flex-col gap-2", className)}>
        <SectionHead title="This month against last" />
        <p className="text-meta text-muted">Cycle comparison after the 30 Nov statement.</p>
        <p className="text-meta text-muted">
          Purchase alerts not turned on yet.{" "}
          <Button
            variant="link"
            className="h-auto p-0 text-meta font-normal"
            onClick={() => openSheet({ kind: "alerts" })}
          >
            Alerts to turn on
          </Button>
        </p>
      </section>
    );
  }
  const diff = spending.now - spending.last;
  return (
    <section className={cn("flex-col gap-2", className)}>
      <SectionHead title="Card spending this month" />
      <p className="text-meta text-ink-2">
        <Amount value={spending.now} className="text-meta" /> so far,{" "}
        <Amount value={Math.abs(diff)} className="text-meta" /> {diff < 0 ? "less" : "more"} than this day last month
      </p>
      <SpendChart spending={spending} />
      <p className="flex items-center gap-1.5 text-caption text-muted">
        <span className="w-3 border-t-2 border-primary" aria-hidden="true" /> This month
        <span className="ml-3 w-3 border-t-2 border-dashed border-muted" aria-hidden="true" /> Last month
      </p>
    </section>
  );
}

export function Purchases({ purchases, className }: { purchases: Purchase[]; className?: string }) {
  return (
    <Fold title="Recent purchases" summary={purchases.length} className={className}>
      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] gap-x-2.5 gap-y-1.5 text-meta">
        {purchases.map((p) => (
          <div key={`${p.date}-${p.merchant}`} className="contents">
            <span className="pt-px font-mono text-caption text-muted">{p.date}</span>
            <span className="text-ink">
              {p.merchant} <span className="text-caption text-muted">{p.card}</span>
              {p.note && <span className="block text-caption text-warn">{p.note}</span>}
            </span>
            <Amount value={p.amount} className="text-right text-meta text-ink" />
          </div>
        ))}
      </div>
    </Fold>
  );
}

export function CardStatements({ spending, statements, className }: {
  spending: SpendingData | null;
  statements: CardSpend[];
  className?: string;
}) {
  const money = useMoneyText();
  return (
    <Fold
      title="Card statements"
      summary={money(statements.reduce((s, r) => s + r.now, 0))}
      className={className}
    >
      {spending && <CardTable rows={spending.cards} head={["Spending", "Jan to 18th", "Feb to 18th"]} />}
      <CardTable rows={statements} head={["Statement", "Last cycle", "This cycle"]} total />
    </Fold>
  );
}

export function NotActive({ charges, className }: { charges: InactiveCharge[]; className?: string }) {
  return (
    <Fold title="Not active" summary={charges.length} className={className}>
      <div className="flex flex-col gap-1.5 text-meta">
        {charges.map((c) => (
          <span key={c.name} className="text-ink">
            {c.name} <span className="text-caption text-muted">{c.note}</span>
          </span>
        ))}
      </div>
    </Fold>
  );
}
