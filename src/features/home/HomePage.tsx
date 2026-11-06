import { useCallback, useEffect, useState, type ReactNode } from "react";

import { fetchServices, fetchStorage, type Service } from "@/api/homelab";
import { getAutomation, listAutomations, type Automation, type RunStatus } from "@/api/automations";
import { getActivitySummary, type ActivitySummary } from "@/api/activity";
import { Chip, EmptyState, ListRow, ListSection, PageBody } from "@/components/system";
import { usd } from "@/features/activity/format";
import { AppList, openableApps } from "@/features/apps/AppList";
import { describeCron } from "@/features/automations/format";
import { gib, statusOf } from "@/features/homelab/format";
import { rememberHomelabView } from "@/features/homelab/HomelabPage";
import { useUiStore } from "@/store/uiStore";

const NAME = "Pryce";
const DAY = 86_400_000;

function period(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/** Whole days from today to the given time: 0 today, 1 tomorrow, -1 yesterday. */
function daysFromToday(d: Date): number {
  return Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
}

/** "Tomorrow 7:00", "Sun 18:00": the Next up column, in monospace. */
function shortNext(iso: string): string {
  const d = new Date(iso);
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hourCycle: "h23" })
    .replace(/^0/, "");
  const days = daysFromToday(d);
  if (days <= 0) return time;
  if (days === 1) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${time}`;
}

/** "tomorrow at 7:00 AM", for the sentence. */
function sentenceWhen(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const days = daysFromToday(d);
  if (days <= 0) return `today at ${time}`;
  if (days === 1) return `tomorrow at ${time}`;
  return `${d.toLocaleDateString("en-US", { weekday: "long" })} at ${time}`;
}

/** "This morning's", "Yesterday's": when a run happened, as the sentence's opening. */
function runAgo(iso: string): string {
  const d = new Date(iso);
  if (daysFromToday(d) < 0) return "Yesterday's";
  const h = d.getHours();
  return `This ${h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"}'s`;
}

/** "Daily scout" → "daily scout", leaving names like "GitHub token" alone. */
function lowerFirst(name: string): string {
  return /^[A-Z][a-z]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name;
}

/** "every day", "weekdays", "Sundays": the schedule without its time, which has its own column. */
function cadence(a: Automation): string {
  const text = describeCron(a.trigger.cron).replace(/ at .*$/, "");
  return /^(Every|Weekdays|Weekends|Monthly)/.test(text) ? lowerFirst(text) : text;
}

const LAST_RUN: Record<RunStatus, string> = {
  running: "Running now",
  success: "Last run done",
  skipped: "Last run skipped, nothing to report",
  needs_approval: "Last run needs approval",
  error: "Last run failed",
  missed: "Last run missed",
};

interface Failure {
  automation: Automation;
  step: string | null;
}

interface HomeData {
  services: Service[] | null | undefined; // undefined while loading, null when it failed
  mediaFree: number | null | undefined;
  automations: Automation[] | null | undefined;
  summary: ActivitySummary["last_24h"] | null | undefined;
  failure: Failure | null;
}

const LOADING: HomeData = {
  services: undefined,
  mediaFree: undefined,
  automations: undefined,
  summary: undefined,
  failure: null,
};

const settled = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === "fulfilled" ? r.value : null);

/** The most recent automation that failed in the last 24 hours, with the step it failed at. */
async function latestFailure(automations: Automation[]): Promise<Failure | null> {
  const failed = automations
    .filter((a) => a.last_status === "error" && a.last_run_at && Date.now() - Date.parse(a.last_run_at) < DAY)
    .sort((a, b) => b.last_run_at!.localeCompare(a.last_run_at!))[0];
  if (!failed) return null;
  const detail = await getAutomation(failed.id).catch(() => null);
  const step = detail?.runs[0]?.steps?.find((s) => s.status === "error")?.name ?? null;
  return { automation: failed, step };
}

/** Home: the date and greeting, one sentence on how things are, status chips, the next automation
 * runs and the app list. App docks the ask bar below it; sending a message turns Home into the
 * conversation. Each source loads on its own, so one failing leaves the rest. */
export function HomePage() {
  const privateRevealed = useUiStore((s) => s.privateRevealed);
  const togglePrivate = useUiStore((s) => s.togglePrivate);
  const toggleHomelab = useUiStore((s) => s.toggleHomelab);
  const toggleAutomations = useUiStore((s) => s.toggleAutomations);
  const toggleGateway = useUiStore((s) => s.toggleGateway);
  const toggleAudit = useUiStore((s) => s.toggleAudit);
  const [data, setData] = useState<HomeData>(LOADING);

  const load = useCallback(async () => {
    const [services, storage, automations, summary] = await Promise.allSettled([
      fetchServices(),
      fetchStorage(),
      listAutomations(),
      getActivitySummary(),
    ]);
    const autos = settled(automations);
    setData({
      services: settled(services)?.services ?? null,
      mediaFree: settled(storage)?.media.free_bytes ?? null,
      automations: autos,
      summary: settled(summary)?.last_24h ?? null,
      failure: autos ? await latestFailure(autos) : null,
    });
  }, []);

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
  const down = checked.filter((s) => statusOf(s) === "down");
  const up = checked.filter((s) => statusOf(s) === "up").length;
  const apps = openableApps(visible);
  const upcoming = (data.automations ?? [])
    .filter((a) => a.enabled && a.next_run_at)
    .sort((a, b) => a.next_run_at!.localeCompare(b.next_run_at!))
    .slice(0, 3);
  const pending = (v: unknown) => (v === undefined ? "…" : "?");

  function openHomelab(view: "list" | "storage") {
    rememberHomelabView(view);
    toggleHomelab();
  }

  return (
    <PageBody className="@container gap-6">
      <div>
        <p className="text-meta text-muted">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-heading font-semibold tracking-[-0.01em] text-ink">
          Good {period()},{" "}
          {/* Tapping the name reveals private apps. Deliberately looks like plain text. */}
          <button type="button" onClick={togglePrivate} className="cursor-text">
            {NAME}
          </button>
        </h1>
      </div>

      <Lede data={data} checked={checked.length} down={down} upcoming={upcoming[0]} />

      <div className="flex flex-wrap gap-2">
        <Chip
          label="Services"
          value={data.services ? `${up}/${checked.length}` : pending(data.services)}
          tone={data.services ? (down.length ? "err" : "ok") : undefined}
          onClick={() => openHomelab("list")}
        />
        <Chip
          label="Media free"
          value={data.mediaFree != null ? `${gib(data.mediaFree)} GB` : pending(data.mediaFree)}
          onClick={() => openHomelab("storage")}
        />
        <Chip
          label="Spend, 24 h"
          value={data.summary ? usd(data.summary.cost_usd) : pending(data.summary)}
          onClick={toggleGateway}
        />
        <Chip
          label="Errors"
          value={data.summary ? data.summary.errors : pending(data.summary)}
          tone={data.summary?.errors ? "err" : undefined}
          onClick={toggleAudit}
        />
      </div>

      <div className="grid gap-6 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.75fr)] @4xl:items-start">
        <section className="flex flex-col gap-2.5" aria-labelledby="home-next">
          <SectionTitle id="home-next">Next up</SectionTitle>
          {data.automations === undefined ? null : upcoming.length ? (
            <ListSection>
              {upcoming.map((a) => (
                <ListRow
                  key={a.id}
                  title={a.name}
                  description={
                    <>
                      {a.last_status ? (
                        <span className={a.last_status === "error" ? "text-err" : undefined}>
                          {LAST_RUN[a.last_status]}
                        </span>
                      ) : (
                        "Not run yet"
                      )}
                      {" · "}
                      {cadence(a)}
                    </>
                  }
                  meta={<span className="font-mono text-ink-2">{shortNext(a.next_run_at!)}</span>}
                  onClick={toggleAutomations}
                />
              ))}
            </ListSection>
          ) : (
            <EmptyState
              title={data.automations === null ? "Couldn't load automations" : "Nothing scheduled"}
              action={{ label: "Open Automations", onClick: toggleAutomations }}
            >
              {data.automations === null ? undefined : "Scheduled automations show here with their last result."}
            </EmptyState>
          )}
        </section>

        {apps.length > 0 && (
          <section className="flex flex-col gap-2.5" aria-labelledby="home-apps">
            <SectionTitle id="home-apps" count={apps.length}>
              Apps
            </SectionTitle>
            <AppList apps={apps} />
          </section>
        )}
      </div>
    </PageBody>
  );
}

function SectionTitle({ id, count, children }: { id: string; count?: number; children: ReactNode }) {
  return (
    <h2 id={id} className="flex items-baseline gap-2 text-meta font-semibold text-ink">
      {children}
      {count != null && <span className="font-normal text-muted tabular-nums">{count}</span>}
    </h2>
  );
}

/** One plain sentence on how things are: services, media space, and the latest failure or next run. */
function Lede({
  data,
  checked,
  down,
  upcoming,
}: {
  data: HomeData;
  checked: number;
  down: Service[];
  upcoming: Automation | undefined;
}) {
  if (data.services === undefined) {
    return <p className="text-title leading-6 text-muted">Checking on things…</p>;
  }

  const media = data.mediaFree == null ? null : `${gib(data.mediaFree)} GB is free for media`;
  let homelab: ReactNode;
  if (data.services === null) {
    homelab = (
      <>
        <span className="text-err">The homelab isn't answering</span>
        {media ? `, but ${media}.` : "."}
      </>
    );
  } else if (down.length) {
    const names = down.length <= 2 ? ` (${down.map((s) => s.name).join(" and ")})` : "";
    homelab = (
      <>
        <span className="text-err">
          {down.length} of {checked} services {down.length === 1 ? "is" : "are"} down
        </span>
        {names}
        {media ? `, and ${media}.` : "."}
      </>
    );
  } else {
    homelab = `All ${checked} services are up${media ? ` and ${media}` : ""}.`;
  }

  let automation: ReactNode = null;
  const { failure } = data;
  if (failure) {
    const a = failure.automation;
    automation = (
      <>
        {" "}
        <span className="text-err">
          {runAgo(a.last_run_at!)} {lowerFirst(a.name)} failed
        </span>
        {failure.step ? ` at the ${failure.step} step` : ""}
        {a.next_run_at ? `; it runs again ${sentenceWhen(a.next_run_at)}.` : "."}
      </>
    );
  } else if (upcoming) {
    automation = ` Next up is the ${lowerFirst(upcoming.name)}, ${sentenceWhen(upcoming.next_run_at!)}.`;
  }

  return (
    <p className="max-w-[62ch] text-title leading-6 text-ink-2">
      {homelab}
      {automation}
    </p>
  );
}
