import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import {
  errorText,
  fetchContainer,
  fetchService,
  restartContainer,
  startContainer,
  updateServiceState,
  type ContainerDetail,
  type Service,
  type ServiceDetail,
  type ServiceStateUpdate,
} from "@/api/homelab";
import { STATUS_LABEL, StatusDot, fmtTime, statusLine, statusOf } from "./format";

interface Props {
  service: Service | null; // null = closed
  allServices: Service[];
  onClose: () => void;
  onChanged: () => void;
}

const LIFECYCLE_LABEL: Record<string, string> = {
  vzstart: "Started",
  vzstop: "Stopped",
  vzshutdown: "Shut down",
  vzreboot: "Restarted",
  vzsuspend: "Suspended",
  vzresume: "Resumed",
};

export function ServiceSheet({ service, allServices, onClose, onChanged }: Props) {
  const isMobile = useIsMobile();
  const [detail, setDetail] = useState<ServiceDetail | null>(null);
  const [container, setContainer] = useState<ContainerDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const id = service?.id ?? null;
  const vmid = service?.container ?? null;

  const loadDetail = useCallback(async () => {
    if (!id) return;
    const [d, c] = await Promise.allSettled([
      fetchService(id),
      vmid != null ? fetchContainer(vmid) : Promise.resolve(null),
    ]);
    if (d.status === "fulfilled") {
      setDetail(d.value);
      setNotes(d.value.state?.notes ?? "");
    }
    setContainer(c.status === "fulfilled" ? c.value : null);
  }, [id, vmid]);

  useEffect(() => {
    setDetail(null);
    setContainer(null);
    setMessage(null);
    loadDetail();
  }, [loadDetail]);

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ text: label, error: false });
      onChanged();
      await loadDetail();
    } catch (err) {
      setMessage({ text: errorText(err), error: true });
    } finally {
      setBusy(false);
    }
  }

  const saveState = (body: ServiceStateUpdate, label: string) =>
    run(label, () => updateServiceState(id!, body));

  // Use the fresher detail once it arrives, but render immediately from the list row.
  const s = detail ?? service;
  const kind = s ? statusOf(s) : "unknown";
  const sharing = allServices.filter((o) => vmid != null && o.container === vmid && o.id !== id);
  const containerStatus = container?.status ?? s?.live?.container_status ?? null;

  return (
    <Sheet open={service !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn("gap-0", isMobile ? "max-h-[88dvh]" : "w-full sm:max-w-md")}
      >
        {s && (
          <>
            <SheetHeader className="border-b border-border">
              <SheetTitle className="flex items-center gap-2 text-base">
                <StatusDot kind={kind} />
                {s.name}
              </SheetTitle>
              <SheetDescription>{s.description || STATUS_LABEL[kind]}</SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <p className={cn("text-sm", kind === "down" ? "text-destructive" : "text-ink")}>
                {statusLine(s)}
                {s.live?.latency_ms != null && kind === "up" && (
                  <span className="text-muted"> · {s.live.latency_ms} ms</span>
                )}
              </p>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                {vmid != null && (
                  <Fact label="Container">
                    CT {vmid}
                    {containerStatus && <span className="text-muted"> · {containerStatus}</span>}
                  </Fact>
                )}
                {s.depends_on.length > 0 && <Fact label="Needs">{s.depends_on.join(", ")}</Fact>}
                {s.repo && (
                  <Fact label="Repo">
                    <a
                      href={`https://github.com/${s.repo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {s.repo}
                    </a>
                  </Fact>
                )}
                {s.open_url && (
                  <Fact label="Open">
                    <a
                      href={s.open_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                    >
                      {s.open_url.replace(/^https?:\/\//, "")}
                      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                    </a>
                  </Fact>
                )}
              </dl>

              {s.lifecycle !== "planned" && (
                <section className="flex flex-col gap-2" aria-label="Maintenance">
                  <h3 className="text-sm font-medium text-ink">Maintenance</h3>
                  <div className="flex flex-wrap gap-2">
                    {s.state?.in_maintenance ? (
                      <Button variant="outline" size="sm" disabled={busy}
                        onClick={() => saveState({ maintenance_minutes: 0 }, "Maintenance ended")}>
                        End maintenance
                      </Button>
                    ) : (
                      [15, 60].map((m) => (
                        <Button key={m} variant="outline" size="sm" disabled={busy}
                          onClick={() => saveState({ maintenance_minutes: m }, `Maintenance for ${m} min`)}>
                          {m === 60 ? "1 hour" : `${m} min`}
                        </Button>
                      ))
                    )}
                  </div>
                  <label className="flex items-center justify-between gap-3 text-sm text-ink">
                    Mute alerts
                    <Switch
                      checked={s.state?.muted ?? false}
                      disabled={busy || !s.state}
                      onCheckedChange={(checked) =>
                        saveState({ muted: checked }, checked ? "Muted" : "Unmuted")
                      }
                    />
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => {
                      if (notes !== (s.state?.notes ?? "")) saveState({ notes }, "Note saved");
                    }}
                    placeholder="Notes (saved when you leave the field)"
                    rows={2}
                    className="w-full resize-none rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary"
                  />
                </section>
              )}

              {vmid != null && (
                <section className="flex flex-col gap-2" aria-label="Container actions">
                  <h3 className="text-sm font-medium text-ink">Container</h3>
                  <div className="flex flex-wrap gap-2">
                    {containerStatus === "stopped" ? (
                      <Button size="sm" disabled={busy}
                        onClick={() => run(`Starting CT ${vmid}`, () => startContainer(vmid))}>
                        Start CT {vmid}
                      </Button>
                    ) : (
                      <Button variant="destructive" size="sm" disabled={busy}
                        onClick={() => setConfirmRestart(true)}>
                        Restart CT {vmid}
                      </Button>
                    )}
                  </div>
                </section>
              )}

              {message && (
                <p className={cn("text-sm", message.error ? "text-destructive" : "text-muted")} role="status">
                  {message.text}
                </p>
              )}

              <History detail={detail} container={container} />
            </div>

            <Dialog open={confirmRestart} onOpenChange={setConfirmRestart}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Restart CT {vmid}?</DialogTitle>
                  <DialogDescription>
                    {s.name} goes down for about 10–30 seconds.
                    {sharing.length > 0 && ` Also restarts: ${sharing.map((o) => o.name).join(", ")}.`}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmRestart(false)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setConfirmRestart(false);
                      run(`Restart requested for CT ${vmid}`, () => restartContainer(vmid!));
                    }}
                  >
                    Restart
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </>
  );
}

function History({ detail, container }: { detail: ServiceDetail | null; container: ContainerDetail | null }) {
  const events = detail?.events ?? [];
  const tasks = container?.recent_lifecycle ?? [];
  if (!detail) return <p className="text-sm text-muted">Loading history…</p>;
  return (
    <section className="flex flex-col gap-2" aria-label="History">
      <h3 className="text-sm font-medium text-ink">History</h3>
      {events.length === 0 && tasks.length === 0 && (
        <p className="text-sm text-muted">No outages or restarts recorded.</p>
      )}
      <ul className="flex flex-col gap-1 text-sm">
        {events.map((e) => (
          <li key={`e-${e.at}`} className="flex justify-between gap-3">
            <span className={e.up ? "text-ink" : "text-destructive"}>
              {e.up ? "Back up" : "Went down"}
              {e.detail && <span className="text-muted"> · {e.detail}</span>}
              {e.in_maintenance && <span className="text-muted"> · maintenance</span>}
            </span>
            <span className="shrink-0 text-muted">{fmtTime(e.at)}</span>
          </li>
        ))}
        {tasks.map((t) => (
          <li key={`t-${t.start_time}-${t.type}`} className="flex justify-between gap-3">
            <span className="text-ink">
              CT {LIFECYCLE_LABEL[t.type] ?? t.type}
              <span className="text-muted"> · {t.user}</span>
            </span>
            <span className="shrink-0 text-muted">{fmtTime(t.start_time)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
