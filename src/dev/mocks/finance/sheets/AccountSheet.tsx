import { Line, LineChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { shortDate, type Account, type AccountId, type FinanceState, type SeriesPoint } from "../data";
import { Amount } from "../Masked";
import { inDays, inDaysShort, lastDot, SectionHead } from "../parts";
import { accountLabel, isYours, RuleChoice, SHEET_BUTTON_CLASS, useMaskFigures } from "./accountParts";
import { FinanceSheet } from "./FinanceSheet";

const CONFIG = { value: { label: "Balance", color: "var(--color-ink-2)" } } satisfies ChartConfig;

function History({ points }: { points: SeriesPoint[] }) {
  return (
    <section className="flex flex-col gap-1.5">
      <SectionHead title="History" count={points.length} />
      <ChartContainer
        config={CONFIG}
        initialDimension={{ width: 340, height: 72 }}
        className="aspect-auto h-18 w-full"
        role="img"
        aria-label={`Balance from ${points[0].date} to ${points[points.length - 1].date}`}
      >
        <LineChart data={points} margin={{ top: 4, right: 6, bottom: 0, left: 6 }}>
          <XAxis
            dataKey="date"
            ticks={[points[0].date, points[points.length - 1].date]}
            interval={0}
            tickLine={false}
            axisLine={{ stroke: "var(--color-line)" }}
            className="font-mono"
          />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            dataKey="value"
            type="linear"
            isAnimationActive={false}
            stroke="var(--color-value)"
            strokeWidth={1.6}
            dot={lastDot(points.length - 1, 3)}
            activeDot={false}
          />
        </LineChart>
      </ChartContainer>
    </section>
  );
}

function Trail({ account }: { account: Account }) {
  const maskFigures = useMaskFigures();
  const last = account.trail.length - 1;
  return (
    <section className="flex flex-col gap-1.5">
      <SectionHead title="Sources" count={account.trail.length} />
      <ol className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
        {account.trail.map((s, i) => (
          <li key={`${s.source}-${s.asOf}`} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-baseline gap-x-2.5 px-3 py-2">
            <span
              className={cn("size-2 rounded-full", i === last ? "bg-ink" : "border border-muted")}
              aria-label={i === last ? "Current figure" : undefined}
            />
            <span className="flex min-w-0 flex-col">
              <span className="text-body text-ink">
                {s.source}
                <span className="text-muted"> · {s.asOf}</span>
              </span>
              {s.note && <span className="truncate text-caption text-muted">{maskFigures(s.note)}</span>}
            </span>
            <Amount value={s.value} className="text-body text-ink" />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Statement({ account, today }: { account: Account; today: string }) {
  const maskFigures = useMaskFigures();
  const { due } = account;
  if (!due) return null;
  const payment = due.scheduled ? maskFigures(due.scheduled) : due.autopay ? "AutoPay on" : "None seen";
  return (
    <section className="flex flex-col gap-1.5">
      <SectionHead title="Statement" />
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-meta">
        <dt className="text-muted">Balance</dt>
        <dd className="text-ink">
          <Amount value={due.statement} className="text-meta" />
          <span className="text-muted"> · min </span>
          <Amount value={due.minimum} className="text-meta" />
        </dd>
        <dt className="text-muted">Due</dt>
        <dd className="text-ink">
          {shortDate(today, due.inDays)}, {inDays(due.inDays)}
        </dd>
        <dt className="text-muted">Payment</dt>
        <dd className="text-ink">{payment}</dd>
        {account.cycle && (
          <>
            <dt className="text-muted">Cycle</dt>
            <dd className="text-ink-2">{account.cycle}</dd>
          </>
        )}
      </dl>
    </section>
  );
}

function Pays({ account, state }: { account: Account; state: FinanceState }) {
  const paid = state.dues.filter((d) => d.via && account.name.startsWith(d.via));
  if (!paid.length) return null;
  return (
    <section className="flex flex-col gap-1.5">
      <SectionHead title="Pays" count={paid.length} />
      <ul className="flex flex-col gap-1">
        {paid.map((d) => (
          <li key={d.id} className="flex items-baseline gap-2 text-meta">
            <span className="min-w-0 flex-1 truncate text-ink">{d.name}</span>
            <span className="font-mono text-caption text-muted">{inDaysShort(d.inDays)}</span>
            <Amount value={d.amount} approx={d.approx} none="in PDF" className="text-meta text-ink" />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface AccountSheetProps {
  state: FinanceState;
  accountId: AccountId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onManual: (accountId: AccountId) => void;
  onCapture: () => void;
}

export function AccountSheet({ state, accountId, open, onOpenChange, onManual, onCapture }: AccountSheetProps) {
  const account = state.accounts.find((a) => a.id === accountId) ?? null;
  const figure = account?.figure ?? null;

  return (
    <FinanceSheet
      open={open && account !== null}
      onOpenChange={onOpenChange}
      title={account?.name}
      subtitle={account && accountLabel(account)}
      footer={
        account && (
          <>
            <Button variant="outline" className={SHEET_BUTTON_CLASS} onClick={() => onManual(account.id)}>
              {figure ? "Edit by hand" : "Type it in"}
            </Button>
            <Button variant="outline" className={SHEET_BUTTON_CLASS} onClick={onCapture}>
              Share a screenshot
            </Button>
          </>
        )
      }
    >
      {account && (
        <>
          <div className="flex flex-col gap-0.5">
            <Amount value={figure?.value ?? null} none="No figure yet" className="self-start text-heading font-medium text-ink" />
            {figure && (
              <p className="text-meta text-ink-2">
                {figure.source} · {figure.ageDays === 0 ? figure.when : `${figure.when}, ${figure.ageDays} d ago`}
                {account.owed && " · owed"}
              </p>
            )}
            {account.stale && <p className="text-meta text-warn">{account.stale}</p>}
          </div>
          {account.history.length > 1 && <History points={account.history} />}
          {account.trail.length > 0 && <Trail account={account} />}
          {isYours(figure) && <RuleChoice key={account.id} />}
          <Statement account={account} today={state.today} />
          <Pays account={account} state={state} />
        </>
      )}
    </FinanceSheet>
  );
}
