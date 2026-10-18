import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import {
  createAutomation,
  deleteAutomation,
  getAutomation,
  previewSchedule,
  runAutomation,
  updateAutomation,
  type AutomationDetail,
  type AutomationInput,
} from "@/api/automations";
import { errorText } from "@/api/homelab";
import { useChatStore } from "@/store/chatStore";
import { useSessionStore } from "@/store/sessionStore";
import { useUiStore } from "@/store/uiStore";
import { RunHistory } from "./RunHistory";
import { TIMEZONES, describeCron, shortWhen } from "./format";

interface Props {
  target: string | null; // null = closed, "new" = create, otherwise automation id
  onClose: () => void;
  onChanged: () => void;
}

const BLANK = { name: "", cron: "0 8 * * *", timezone: "America/New_York", prompt: "", notify: true, journal: false, skip: false, enabled: true };
const field = "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary";

export function AutomationSheet({ target, onClose, onChanged }: Props) {
  const isMobile = useIsMobile();
  const isNew = target === "new";
  const [detail, setDetail] = useState<AutomationDetail | null>(null);
  const [form, setForm] = useState(BLANK);
  const [preview, setPreview] = useState<{ upcoming?: string[]; error?: string }>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (!target || target === "new") return;
    const d = await getAutomation(target);
    setDetail(d);
    return d;
  }, [target]);

  // Reset the form whenever a different automation (or the create form) opens.
  useEffect(() => {
    setMessage(null);
    setDetail(null);
    if (!target) return;
    if (target === "new") {
      setForm(BLANK);
      return;
    }
    load().then((d) => {
      if (!d) return;
      setForm({
        name: d.name,
        cron: d.trigger.cron,
        timezone: d.trigger.timezone,
        prompt: d.action.type === "sazed_prompt" ? d.action.prompt : "",
        notify: !!d.outputs.pushover,
        journal: !!d.outputs.journal,
        skip: d.outputs.skip_if_nothing,
        enabled: d.enabled,
      });
    }).catch((err) => setMessage({ text: errorText(err), error: true }));
  }, [target, load]);

  // While a run is in flight, poll so its result appears without a manual refresh.
  useEffect(() => {
    if (!detail?.runs.some((r) => r.status === "running")) return;
    const id = setTimeout(() => load()?.then(() => onChanged()), 3000);
    return () => clearTimeout(id);
  }, [detail, load, onChanged]);

  // Live schedule check: validates the cron and shows the next run times.
  useEffect(() => {
    if (!target) return;
    const id = setTimeout(() => {
      previewSchedule(form.cron, form.timezone)
        .then((p) => setPreview({ upcoming: p.upcoming }))
        .catch((err) => setPreview({ error: errorText(err) }));
    }, 400);
    return () => clearTimeout(id);
  }, [form.cron, form.timezone, target]);

  const isGateway = detail?.action.type === "gateway_call";
  const canSave = form.name.trim() && (isGateway || form.prompt.trim()) && !preview.error && !busy;

  function input(): AutomationInput {
    return {
      name: form.name.trim(),
      enabled: form.enabled,
      trigger: { type: "cron", cron: form.cron.trim(), timezone: form.timezone },
      action: isGateway && detail ? detail.action : { type: "sazed_prompt", prompt: form.prompt.trim() },
      outputs: {
        pushover: form.notify ? detail?.outputs.pushover ?? {} : null,
        journal: form.journal ? detail?.outputs.journal ?? {} : null,
        skip_if_nothing: form.skip,
      },
    };
  }

  async function act(label: string, fn: () => Promise<unknown>, close = false) {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      onChanged();
      if (close) onClose();
      else {
        setMessage({ text: label, error: false });
        await load();
      }
    } catch (err) {
      setMessage({ text: errorText(err), error: true });
    } finally {
      setBusy(false);
    }
  }

  function openSession(sessionId: string) {
    useSessionStore.getState().selectSession(sessionId);
    useChatStore.getState().loadSession(sessionId);
    useUiStore.getState().closeAll();
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Sheet open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={isMobile ? "bottom" : "right"} className={cn("gap-0", isMobile ? "max-h-[90dvh]" : "w-full sm:max-w-md")}>
        <SheetHeader className="border-b border-border">
          <SheetTitle className="text-base">{isNew ? "New automation" : form.name || "Automation"}</SheetTitle>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <label className="flex flex-col gap-1 text-sm text-ink">
            Name
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Morning brief" className={field} />
          </label>

          {isGateway && detail?.action.type === "gateway_call" ? (
            <p className="text-sm text-muted">
              Calls the gateway directly: <code className="text-ink">{detail.action.method} {detail.action.path}</code>
            </p>
          ) : (
            <label className="flex flex-col gap-1 text-sm text-ink">
              What Sazed should do each time
              <textarea value={form.prompt} onChange={(e) => set("prompt", e.target.value)} rows={4}
                placeholder="Check my calendar, tasks due today and unread email. Give me a two-sentence brief, most urgent thing first."
                className={cn(field, "resize-none")} />
            </label>
          )}

          <div className="flex flex-col gap-1 text-sm text-ink">
            Schedule
            <div className="flex gap-2">
              <input value={form.cron} onChange={(e) => set("cron", e.target.value)} aria-label="Cron expression" className={cn(field, "font-mono")} />
              <select value={form.timezone} onChange={(e) => set("timezone", e.target.value)} aria-label="Timezone" className={cn(field, "w-auto")}>
                {[...new Set([form.timezone, ...TIMEZONES])].map((tz) => <option key={tz} value={tz}>{tz.replace("America/", "")}</option>)}
              </select>
            </div>
            <p className={cn("text-xs", preview.error ? "text-destructive" : "text-muted")}>
              {preview.error ?? `${describeCron(form.cron)} · next: ${(preview.upcoming ?? []).slice(0, 3).map((t) => shortWhen(t, form.timezone)).join(", ")}`}
            </p>
            <p className="text-xs text-muted">Cron: minute hour day month weekday, e.g. 0 8 * * 1-5 = weekdays at 8:00.</p>
          </div>

          <div className="flex flex-col gap-2.5 text-sm text-ink">
            {([["enabled", "On"], ["notify", "Send to Pushover"], ["journal", "Save to journal"], ["skip", "Stay quiet when there's nothing to report"]] as const).map(([k, label]) => (
              <label key={k} className="flex items-center justify-between gap-3">
                {label}
                <Switch aria-label={label} checked={form[k]} onCheckedChange={(v) => set(k, v)} />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!canSave}
              onClick={() => isNew ? act("Created", () => createAutomation(input()), true) : act("Saved", () => updateAutomation(target!, input()))}>
              {isNew ? "Create" : "Save"}
            </Button>
            {!isNew && (
              <>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act("Run started", () => runAutomation(target!))}>Run now</Button>
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete</Button>
              </>
            )}
          </div>

          {message && <p role="status" className={cn("text-sm", message.error ? "text-destructive" : "text-muted")}>{message.text}</p>}

          {detail && (
            <section className="flex flex-col gap-1" aria-label="Run history">
              <h3 className="text-sm font-medium text-ink">Runs</h3>
              <RunHistory runs={detail.runs} timezone={detail.trigger.timezone} onOpenSession={openSession} />
            </section>
          )}
        </div>

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete “{form.name}”?</DialogTitle>
              <DialogDescription>Its run history is deleted too. This can't be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { setConfirmDelete(false); act("Deleted", () => deleteAutomation(target!), true); }}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
