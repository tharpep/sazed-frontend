import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { fetchServices, fetchStorage, type Service } from "@/api/homelab";
import { listAutomations, type Automation } from "@/api/automations";
import { listJobs } from "@/api/jobs";
import { listBacklog } from "@/api/backlog";
import { AppGrid } from "@/features/apps/AppGrid";
import { gib, statusOf } from "@/features/homelab/format";
import { rememberHomelabView } from "@/features/homelab/HomelabPage";
import { useUiStore } from "@/store/uiStore";

const NAME = "Pryce";

function getPeriod(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/** "7 AM", "Tomorrow 7 AM", or "Sun 6:30 PM": short enough for a third of a phone. */
function when(iso: string): string {
  const d = new Date(iso);
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(":00", "");
  const days = Math.round(
    (new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000
  );
  if (days <= 0) return time;
  if (days === 1) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${time}`;
}

interface Waiting {
  key: string;
  text: string;
  open: () => void;
}

interface HomeData {
  services: Service[] | null;
  mediaFree: number | null;
  nextRun: Automation | null | undefined; // undefined until automations load
  waiting: Waiting[];
}

/** Home: the greeting, anything waiting on Pryce, a three-tile homelab glance, and the app
 * launcher. The chat composer is docked below it by App; sending a message turns Home into the
 * conversation. Each source loads on its own, so one failing leaves the rest. */
export function HomePage() {
  const privateRevealed = useUiStore((s) => s.privateRevealed);
  const togglePrivate = useUiStore((s) => s.togglePrivate);
  const toggleHomelab = useUiStore((s) => s.toggleHomelab);
  const toggleAutomations = useUiStore((s) => s.toggleAutomations);
  const toggleBacklog = useUiStore((s) => s.toggleBacklog);
  const [data, setData] = useState<HomeData>({ services: null, mediaFree: null, nextRun: undefined, waiting: [] });

  const load = useCallback(async () => {
    const [services, storage, automations, jobs, backlog] = await Promise.allSettled([
      fetchServices(),
      fetchStorage(),
      listAutomations(),
      listJobs(),
      listBacklog("open"),
    ]);
    const waiting: Waiting[] = [];
    if (jobs.status === "fulfilled") {
      const n = jobs.value.filter((j) => j.status === "needs_approval").length;
      if (n) waiting.push({ key: "jobs", text: `${plural(n, "job")} waiting for approval`, open: toggleAutomations });
      // needs_input: a worker job stopped to ask Pryce a question (plans/11 job controls).
      const asking = jobs.value.filter((j) => j.status === "needs_input").length;
      if (asking)
        waiting.push({ key: "asking", text: `${plural(asking, "job")} waiting for your answer`, open: toggleAutomations });
    }
    if (automations.status === "fulfilled") {
      const n = automations.value.filter((a) => a.last_status === "needs_approval").length;
      if (n) waiting.push({ key: "runs", text: `${plural(n, "automation run")} needing approval`, open: toggleAutomations });
    }
    if (backlog.status === "fulfilled") {
      // Shortlisted only: the scout files untriaged ideas daily, so counting those would never
      // let this strip go empty.
      const n = backlog.value.filter((i) => i.status === "shortlisted").length;
      if (n) waiting.push({ key: "backlog", text: `${plural(n, "shortlisted backlog item")} to decide on`, open: toggleBacklog });
    }
    const upcoming =
      automations.status === "fulfilled"
        ? automations.value
            .filter((a) => a.enabled && a.next_run_at)
            .sort((a, b) => a.next_run_at!.localeCompare(b.next_run_at!))[0] ?? null
        : undefined;
    setData({
      services: services.status === "fulfilled" ? services.value.services : null,
      mediaFree: storage.status === "fulfilled" ? storage.value.media.free_bytes : null,
      nextRun: upcoming,
      waiting,
    });
  }, [toggleAutomations, toggleBacklog]);

  useEffect(() => {
    load();
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const visible = (data.services ?? []).filter((s) => privateRevealed || !s.private);
  const checked = visible.filter((s) => s.lifecycle !== "planned");
  const down = checked.filter((s) => statusOf(s) === "down").length;
  const up = checked.filter((s) => statusOf(s) === "up").length;

  function openHomelab(view: "list" | "storage") {
    rememberHomelabView(view);
    toggleHomelab();
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-6 pt-8">
        <h1 className="px-1 font-display text-3xl text-ink" style={{ letterSpacing: "-0.02em" }}>
          Good {getPeriod()},{" "}
          {/* Tapping the name reveals private apps. Deliberately looks like plain text. */}
          <button type="button" onClick={togglePrivate} className="cursor-text font-display text-primary">
            {NAME}
          </button>
        </h1>

        {data.waiting.length > 0 && (
          <section aria-label="Waiting on you" className="flex flex-col gap-1.5">
            {data.waiting.map((w) => (
              <button
                key={w.key}
                type="button"
                onClick={w.open}
                className="flex items-center justify-between gap-2 rounded-md border border-accent/50 bg-accent/10 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-accent/20"
              >
                {w.text}
                <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
              </button>
            ))}
          </section>
        )}

        <section aria-label="Homelab at a glance" className="grid grid-cols-3 gap-2">
          <Glance
            label="Services"
            value={data.services ? (down ? `${down} down` : `${up} of ${checked.length} up`) : "…"}
            alert={down > 0}
            onClick={() => openHomelab("list")}
          />
          <Glance
            label="Free for media"
            value={data.mediaFree == null ? "…" : `${gib(data.mediaFree)} GB`}
            onClick={() => openHomelab("storage")}
          />
          <Glance
            label={data.nextRun ? data.nextRun.name : "Next automation"}
            value={data.nextRun ? when(data.nextRun.next_run_at!) : data.nextRun === null ? "None scheduled" : "…"}
            onClick={toggleAutomations}
          />
        </section>

        {data.services && <AppGrid services={visible} />}
      </div>
    </div>
  );
}

function Glance({
  label,
  value,
  alert = false,
  onClick,
}: {
  label: string;
  value: string;
  alert?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-md bg-surface px-2.5 py-2 text-left transition-colors hover:bg-surface/70"
    >
      <div className="truncate text-xs text-muted">{label}</div>
      <div className={cn("text-sm font-medium leading-snug", alert ? "text-destructive" : "text-ink")}>{value}</div>
    </button>
  );
}
