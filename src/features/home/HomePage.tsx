import { useCallback, useEffect, useState } from "react";

import { listActivity, type ActivityEvent } from "@/api/activity";
import { listAutomations, type Automation } from "@/api/automations";
import { getCommand, type CommandSummary } from "@/api/command";
import { fetchServices, fetchStorage, type Service } from "@/api/homelab";
import { listProjects, type Project } from "@/api/projects";
import { JobSheet } from "@/features/jobs/JobSheet";
import { gib, statusOf } from "@/features/homelab/format";
import { rememberHomelabView } from "@/features/homelab/HomelabPage";
import { useUiStore } from "@/store/uiStore";

import { HomelabLine, ProjectsInFlight, RecentActivity } from "./HomeSide";
import { NeedsYou } from "./NeedsYou";
import { WorkingNow } from "./WorkingNow";

const NAME = "Pryce";
const COMMAND_POLL_MS = 4000;
const SIDE_POLL_MS = 30_000;
const ACTIVITY_SHOWN = 6;
const PROJECTS_SHOWN = 5;

function getPeriod(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function when(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(":00", "");
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  if (days <= 0) return time;
  if (days === 1) return `tomorrow ${time}`;
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} ${time}`;
}

function useVisiblePoll(load: () => void, ms: number) {
  useEffect(() => {
    load();
    const id = setInterval(() => !document.hidden && load(), ms);
    const onVisible = () => !document.hidden && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, ms]);
}

interface Side {
  services: Service[] | null;
  mediaFree: number | null;
  nextRun: Automation | null;
  projects: Project[] | null;
  activity: ActivityEvent[] | null;
}

export function HomePage() {
  const privateRevealed = useUiStore((s) => s.privateRevealed);
  const togglePrivate = useUiStore((s) => s.togglePrivate);
  const toggleHomelab = useUiStore((s) => s.toggleHomelab);
  const toggleAudit = useUiStore((s) => s.toggleAudit);
  const [command, setCommand] = useState<CommandSummary | null>(null);
  const [commandError, setCommandError] = useState(false);
  const [side, setSide] = useState<Side>({ services: null, mediaFree: null, nextRun: null, projects: null, activity: null });
  const [openJob, setOpenJob] = useState<string | null>(null);

  const loadCommand = useCallback(() => {
    getCommand()
      .then((c) => {
        setCommand(c);
        setCommandError(false);
      })
      .catch(() => setCommandError(true));
  }, []);

  const loadSide = useCallback(async () => {
    const [services, storage, automations, projects, activity] = await Promise.allSettled([
      fetchServices(),
      fetchStorage(),
      listAutomations(),
      listProjects(),
      listActivity([], false, undefined, ACTIVITY_SHOWN),
    ]);
    const nextRun =
      automations.status === "fulfilled"
        ? (automations.value
            .filter((a) => a.enabled && a.next_run_at)
            .sort((a, b) => a.next_run_at!.localeCompare(b.next_run_at!))[0] ?? null)
        : null;
    setSide({
      services: services.status === "fulfilled" ? services.value.services : null,
      mediaFree: storage.status === "fulfilled" ? storage.value.media.free_bytes : null,
      nextRun,
      projects:
        projects.status === "fulfilled"
          ? projects.value.filter((p) => p.state === "active").slice(0, PROJECTS_SHOWN)
          : null,
      activity: activity.status === "fulfilled" ? activity.value : null,
    });
  }, []);

  useVisiblePoll(loadCommand, COMMAND_POLL_MS);
  useVisiblePoll(loadSide, SIDE_POLL_MS);

  const checked = (side.services ?? []).filter((s) => (privateRevealed || !s.private) && s.lifecycle !== "planned");
  const down = checked.filter((s) => statusOf(s) === "down").length;
  const homelab = [
    side.services ? (down ? `Homelab: ${down} down` : `Homelab: ${checked.length} of ${checked.length} up`) : "Homelab…",
    side.mediaFree != null ? `${gib(side.mediaFree)} GB free for media` : null,
    side.nextRun ? `${side.nextRun.name} ${when(side.nextRun.next_run_at!)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const needs = command?.needs ?? [];
  const working = command?.working ?? [];
  const done = command?.done;
  const counts = command
    ? [
        `${needs.length} ${needs.length === 1 ? "thing needs" : "things need"} you`,
        `${working.length} ${working.length === 1 ? "agent" : "agents"} working`,
        `${command.done.succeeded + command.done.failed} jobs finished in the last day`,
      ].join(" · ")
    : commandError
      ? "Couldn't reach Sazed's board."
      : "Loading…";

  function openHomelab() {
    rememberHomelabView("list");
    toggleHomelab();
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-8 pb-6 md:px-8">
        <div className="px-1">
          <h1 className="font-display text-3xl text-ink" style={{ letterSpacing: "-0.02em" }}>
            Good {getPeriod()},{" "}
            <button type="button" onClick={togglePrivate} className="cursor-text font-display text-primary">
              {NAME}
            </button>
          </h1>
          <p className="mt-1 text-meta text-muted">{counts}</p>
        </div>

        <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3.5">
            {command && <NeedsYou cards={needs} onOpenJob={setOpenJob} onChanged={loadCommand} />}
            {command && <WorkingNow jobs={working} onOpenJob={setOpenJob} onChanged={loadCommand} />}
            {done && done.latest.length > 0 && (
              <button
                type="button"
                onClick={toggleAudit}
                className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-left hover:bg-raised/60"
              >
                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${done.failed ? "bg-err" : "bg-ok"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-body text-ink">
                    {done.succeeded} done{done.failed ? `, ${done.failed} failed` : ""} in the last day
                  </span>
                  <span className="block truncate text-caption text-muted">
                    {done.latest.map((j) => `${j.title}${j.status === "succeeded" ? "" : " (failed)"}`).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-caption text-primary">Activity</span>
              </button>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-3.5">
            <ProjectsInFlight projects={side.projects} />
            <RecentActivity events={side.activity} />
            <HomelabLine summary={homelab} alert={down > 0} onOpen={openHomelab} />
          </div>
        </div>
      </div>
      <JobSheet jobId={openJob} onClose={() => setOpenJob(null)} onChanged={loadCommand} onOpenJob={setOpenJob} />
    </div>
  );
}
