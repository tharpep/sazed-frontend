import { cn } from "@/lib/utils";
import type { AlertItem, AlertStatus, FinanceState } from "../data";
import { Fold } from "../parts";
import { FinanceSheet } from "./FinanceSheet";

const LABEL: Record<AlertStatus, string> = { on: "on", part: "partly", off: "not yet" };

const MARK: Record<AlertStatus, string> = {
  on: "bg-ok",
  part: "border-[1.5px] border-warn",
  off: "border-[1.5px] border-line",
};

function byService(alerts: AlertItem[]): [string, AlertItem[]][] {
  const groups = new Map<string, AlertItem[]>();
  for (const a of alerts) groups.set(a.service, [...(groups.get(a.service) ?? []), a]);
  return [...groups];
}

// data.ts holds this as one sentence; the list is what sits between "does not carry:" and the next full stop.
function notByEmailList(sentence: string): string[] {
  const body = sentence.match(/does not carry: (.+?)\. /)?.[1];
  if (!body) return [sentence];
  return body.split(/, (?:or )?/).map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

export function AlertsSheet({ state, open, onOpenChange }: {
  state: FinanceState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const on = state.alerts.filter((a) => a.status === "on").length;
  const missing = notByEmailList(state.notByEmail);
  return (
    <FinanceSheet title="Alerts to turn on" count={`${on} of ${state.alerts.length} on`} open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col gap-2.5">
        {byService(state.alerts).map(([service, items]) => (
          <section key={service} className="flex flex-col gap-1">
            <h3 className="px-0.5 text-caption text-muted">{service}</h3>
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {items.map((a) => (
                <li key={a.name} className="flex min-h-8 items-center gap-2.5 px-3 text-meta">
                  <span className={cn("size-2.5 shrink-0 rounded-full", MARK[a.status])} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-ink">{a.name}</span>
                  <span className={cn("text-caption", a.status === "on" ? "text-ok" : a.status === "part" ? "text-warn" : "text-muted")}>
                    {LABEL[a.status]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Fold title="Not by email" summary={missing.length} className="flex">
        <ul className="flex flex-col gap-1 text-meta text-ink">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </Fold>
    </FinanceSheet>
  );
}
