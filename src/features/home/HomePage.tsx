import { useCallback, useEffect, useRef, useState } from "react";

import { listActivity, type ActivityEvent } from "@/api/activity";
import { getAutomation, listAutomations } from "@/api/automations";
import { listBacklog, type BacklogItem } from "@/api/backlog";
import { getCommand, type CommandSummary } from "@/api/command";
import { fetchCalendarToday, fetchTasksDueToday } from "@/api/display";
import { fetchServices, fetchStorage, type Service } from "@/api/homelab";
import { listProjects, type Project } from "@/api/projects";
import { JobSheet } from "@/features/jobs/JobSheet";
import { gib, statusOf } from "@/features/homelab/format";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useShellStore } from "@/nav/shellFlag";
import { useChatStore } from "@/store/chatStore";
import { useUiStore } from "@/store/uiStore";

import { AskField } from "./AskField";
import { Done } from "./Done";
import { LinkRows, ProjectsBox, TodayBox, TodayLine } from "./HomeSide";
import { askFromHome, goTo, openSystem } from "./homeNav";
import { NeedsYou } from "./NeedsYou";
import { Ready } from "./Ready";
import { Running } from "./Running";
import {
  failedStep,
  latestFailure,
  NO_TODAY,
  nextRun,
  nextToday,
  projectsByRank,
  readyCount,
  runSentence,
  topReady,
  type Today,
} from "./summary";

const NAME = "Pryce";
const COMMAND_POLL_MS = 4000;
const SIDE_POLL_MS = 30_000;
const TODAY_POLL_MS = 5 * 60_000;

function getPeriod(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
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
  runLine: string | null;
  runAlert: boolean;
  projects: Project[] | null;
  latest: ActivityEvent | null;
  backlog: BacklogItem[] | null;
}

const NO_SIDE: Side = {
  services: null,
  mediaFree: null,
  runLine: null,
  runAlert: false,
  projects: null,
  latest: null,
  backlog: null,
};

export function HomePage() {
  const privateRevealed = useUiStore((s) => s.privateRevealed);
  const togglePrivate = useUiStore((s) => s.togglePrivate);
  const shell = useShellStore((s) => s.shell);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const stopReply = useChatStore((s) => s.stop);
  const isMobile = useIsMobile();
  const [command, setCommand] = useState<CommandSummary | null>(null);
  const [commandError, setCommandError] = useState(false);
  const [side, setSide] = useState<Side>(NO_SIDE);
  const [today, setToday] = useState<Today>(NO_TODAY);
  const [openJob, setOpenJob] = useState<string | null>(null);
  const sideSeq = useRef(0);
  const failedRun = useRef<{ run: string; step: string | null } | null>(null);

  const loadCommand = useCallback(() => {
    getCommand()
      .then((c) => {
        setCommand(c);
        setCommandError(false);
      })
      .catch(() => setCommandError(true));
  }, []);

  const loadSide = useCallback(async () => {
    const seq = ++sideSeq.current;
    const [services, storage, automations, projects, activity, backlog] = await Promise.allSettled([
      fetchServices(),
      fetchStorage(),
      listAutomations(),
      listProjects(),
      listActivity([], false, undefined, 1),
      listBacklog("open"),
    ]);
    const autos = automations.status === "fulfilled" ? automations.value : [];
    const failure = latestFailure(autos);
    let step: string | null = null;
    if (failure) {
      // One detail fetch per failed run: the failure stays in the line for a day of 30 s polls.
      const run = `${failure.id}@${failure.last_run_at}`;
      if (failedRun.current?.run !== run) {
        failedRun.current = { run, step: await getAutomation(failure.id).then(failedStep, () => null) };
      }
      step = failedRun.current.step;
    }
    // A slow poll that finishes after a newer one must not put older data back.
    if (seq !== sideSeq.current) return;
    setSide({
      services: services.status === "fulfilled" ? services.value.services : null,
      mediaFree: storage.status === "fulfilled" ? storage.value.media.free_bytes : null,
      runLine: runSentence(failure, step, nextRun(autos)),
      runAlert: failure !== null,
      projects: projects.status === "fulfilled" ? projectsByRank(projects.value) : null,
      latest: activity.status === "fulfilled" ? (activity.value[0] ?? null) : null,
      backlog: backlog.status === "fulfilled" ? backlog.value : null,
    });
  }, []);

  const loadToday = useCallback(async () => {
    const [calendar, tasks] = await Promise.allSettled([fetchCalendarToday(), fetchTasksDueToday()]);
    setToday((prev) =>
      nextToday(
        prev,
        calendar.status === "fulfilled" ? calendar.value.events : null,
        tasks.status === "fulfilled" ? tasks.value.count : null
      )
    );
  }, []);

  useVisiblePoll(loadCommand, COMMAND_POLL_MS);
  useVisiblePoll(loadSide, SIDE_POLL_MS);
  useVisiblePoll(loadToday, TODAY_POLL_MS);

  const checked = (side.services ?? []).filter((s) => (privateRevealed || !s.private) && s.lifecycle !== "planned");
  const down = checked.filter((s) => statusOf(s) === "down").length;
  const homelab = [
    side.services ? (down ? `${down} down` : `${checked.length} of ${checked.length} up`) : "…",
    side.mediaFree != null ? `${gib(side.mediaFree)} GB free for media` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const needs = command?.needs ?? null;
  const working = command?.working ?? null;
  const done = command?.done ?? null;
  const ready = side.backlog ? readyCount(side.backlog) : null;
  const askInline = shell === "hubs" && !isMobile;

  const links = [
    { key: "homelab", label: "Homelab", text: homelab, alert: down > 0, onClick: () => openSystem("homelab") },
    ...(side.latest
      ? [
          {
            key: "activity",
            label: "Activity",
            text: `${side.latest.title} · ${clockTime(side.latest.at)}`,
            alert: side.latest.status === "error",
            onClick: () => openSystem("activity"),
          },
        ]
      : []),
    ...(side.runLine
      ? [
          {
            key: "automations",
            label: "Automations",
            text: side.runLine,
            alert: side.runAlert,
            onClick: () => goTo({ hub: "agents", view: "automations" }),
          },
        ]
      : []),
  ];

  return (
    <div className="@container min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1240px] px-4 pt-5 pb-6 sm:px-7 sm:pt-7">
        <h1 className="font-display text-[26px] leading-8 font-normal tracking-[-0.01em] text-ink sm:text-[30px] sm:leading-9">
          Good {getPeriod()},{" "}
          <button type="button" onClick={togglePrivate} className="-my-1.5 cursor-text py-1.5 font-display">
            {NAME}
          </button>
        </h1>
        <p className="mt-0.5 mb-2 text-body text-muted">
          {command ? (
            <>
              <b className={needs!.length ? "font-medium text-warn" : "font-medium text-ink"}>
                {needs!.length} {needs!.length === 1 ? "needs" : "need"} you
              </b>
              {" · "}
              <b className="font-medium text-ink">{working!.length} running</b>
              {ready != null && ` · ${ready} ready`}
              {` · ${done!.succeeded + done!.failed} done`}
            </>
          ) : commandError ? (
            "Couldn't reach Sazed's board."
          ) : (
            "Loading…"
          )}
        </p>
        <TodayLine today={today} className="@min-[860px]:hidden" />

        <div className="mt-5 grid items-start gap-7 @min-[860px]:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-4">
            <NeedsYou cards={needs} onOpenJob={setOpenJob} onChanged={loadCommand} />
            <Running jobs={working} onOpenJob={setOpenJob} onChanged={loadCommand} />
            <Ready top={side.backlog ? topReady(side.backlog) : []} total={ready} />
            <Done done={done} compact={isMobile} onOpenJob={setOpenJob} />
            {askInline && <AskField onSend={askFromHome} isStreaming={isStreaming} onStop={stopReply} />}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <TodayBox today={today} className="hidden @min-[860px]:block" />
            <ProjectsBox projects={side.projects} />
            <LinkRows label="Elsewhere" rows={links} />
          </div>
        </div>
      </div>
      <JobSheet jobId={openJob} onClose={() => setOpenJob(null)} onChanged={loadCommand} onOpenJob={setOpenJob} />
    </div>
  );
}
