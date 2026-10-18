import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Plus, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { listAutomations, type Automation } from "@/api/automations";
import { errorText } from "@/api/homelab";
import { AutomationSheet } from "./AutomationSheet";
import { RUN_LABEL, describeCron, runTone, shortWhen } from "./format";

const REFRESH_MS = 30_000;

export function AutomationsPage() {
  const [items, setItems] = useState<Automation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // null = closed, "new" = create form, otherwise an automation id
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listAutomations());
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold text-ink">Automations</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Refresh"
            title="Refresh"
            className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setOpen("new")}
            aria-label="New automation"
            title="New automation"
            className="flex size-9 items-center justify-center rounded-md bg-primary text-bg transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 pb-8">
          {error && <p className="text-sm text-destructive">Couldn't load automations: {error}</p>}
          {!items && !error && <p className="text-sm text-muted">Loading…</p>}

          {items && items.length === 0 && (
            <div className="flex flex-col gap-1 px-1 py-6">
              <p className="text-sm text-ink">No automations yet.</p>
              <p className="text-sm text-muted">
                Ask Sazed something like “every weekday at 8, give me a two-line brief of my day”,
                or tap + to set one up here.
              </p>
            </div>
          )}

          {items && items.length > 0 && (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(a.id)}
                    className="flex min-h-[60px] w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-block size-2 shrink-0 rounded-full",
                        a.enabled ? "bg-muted" : "border border-muted"
                      )}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm text-ink">{a.name}</span>
                      <span className="truncate text-xs text-muted">
                        {describeCron(a.trigger.cron)}
                        {a.enabled
                          ? a.next_run_at && ` · next ${shortWhen(a.next_run_at, a.trigger.timezone)}`
                          : " · paused"}
                      </span>
                      {a.last_status && (
                        <span className={cn("truncate text-xs", runTone(a.last_status))}>
                          Last run: {RUN_LABEL[a.last_status]}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AutomationSheet target={open} onClose={() => setOpen(null)} onChanged={load} />
    </div>
  );
}
