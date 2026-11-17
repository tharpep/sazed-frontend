import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { listAutomations, type Automation } from "@/api/automations";
import { errorText } from "@/api/homelab";
import { Page, PageBody } from "@/components/system";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { useNavStore } from "@/store/navStore";
import { AutomationSheet } from "./AutomationSheet";
import { RUN_LABEL, describeCron, runTone, shortWhen } from "./format";

const REFRESH_MS = 30_000;

function openAutomation(id: string) {
  useNavStore.getState().openItem({ kind: "automation", id });
}

export function AutomationsPage() {
  const [items, setItems] = useState<Automation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const navItem = useNavStore((s) => s.open.agents);
  const openId = navItem?.kind === "automation" ? navItem.id : null;

  // An automation opened from anywhere (a row, the palette) replaces the create form.
  useEffect(() => {
    if (openId) setCreating(false);
  }, [openId]);

  const load = useCallback(async () => {
    try {
      setItems(await listAutomations());
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  function startCreate() {
    useNavStore.getState().closeItem("automation");
    setCreating(true);
  }

  function close() {
    if (openId) useNavStore.getState().closeItem("automation");
    else setCreating(false);
  }

  return (
    <Page>
      <PageBody className="max-w-2xl">
        <ToolsRow action={{ label: "New automation", onClick: startCreate }} />
        {error && <p className="text-sm text-destructive">Couldn't load automations: {error}</p>}
        {!items && !error && <p className="text-sm text-muted">Loading…</p>}

        {items && items.length === 0 && (
          <div className="flex flex-col gap-1 px-1 py-6">
            <p className="text-sm text-ink">No automations yet.</p>
            <p className="text-sm text-muted">
              Ask Sazed something like “every weekday at 8, give me a two-line brief of my day”,
              or tap New automation to set one up here.
            </p>
          </div>
        )}

        {items && items.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {items.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => openAutomation(a.id)}
                  aria-current={a.id === openId ? "true" : undefined}
                  className="flex min-h-[60px] w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface aria-[current]:bg-surface"
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
      </PageBody>

      <AutomationSheet target={openId ?? (creating ? "new" : null)} onClose={close} onChanged={load} />
    </Page>
  );
}
