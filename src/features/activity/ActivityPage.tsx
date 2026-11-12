import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, CircleMinus, CirclePlus, CircleX, Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EmptyState,
  ListRow,
  ListSection,
  Page,
  PageBody,
  PageHeader,
  Segmented,
  StatusPill,
  type Tone,
} from "@/components/system";
import {
  getActivitySummary,
  listActivity,
  streamActivity,
  type ActivityCategory,
  type ActivityEvent,
  type ActivitySummary,
  type StepEvent,
} from "@/api/activity";
import { errorText } from "@/api/homelab";
import { listWaitingJobs, type JobSummary } from "@/api/jobs";
import { JobSheet } from "@/features/jobs/JobSheet";
import { KIND_LABEL, STATUS_LABEL, stepsFromEvents } from "@/features/jobs/format";
import { useChatStore } from "@/store/chatStore";
import { useSessionStore } from "@/store/sessionStore";
import { useShellStore } from "@/nav/shellFlag";
import { useUiStore } from "@/store/uiStore";
import { DayChart } from "./DayChart";
import { FlowSheet, type FlowTarget } from "./FlowSheet";
import { CATEGORY_LABEL, categoryOf, dayLabel, iconFor, shortClock, statusTone, usd } from "./format";
import { duration, groupRuns, runSteps, runText, type Run } from "./runs";

type Live = "connecting" | "live" | "reconnecting" | "paused";
type View = "all" | "needs" | "errors";

const LIVE_KEEP = 2000; // live events kept in memory for open flows
const SUMMARY_MS = 30_000;
// The chart needs a full day of events; the API caps a page at 500, far above a normal day.
const CHART_LIMIT = 500;

export function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [view, setView] = useState<View>("all");
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [dayEvents, setDayEvents] = useState<ActivityEvent[]>([]);
  const [waitingJobs, setWaitingJobs] = useState<JobSummary[] | null>(null);
  const [openJob, setOpenJob] = useState<string | null>(null);
  const [live, setLive] = useState<Live>("connecting");
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState<ActivityEvent[]>([]);
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);
  const [liveSteps, setLiveSteps] = useState<StepEvent[]>([]);
  const [latestStep, setLatestStep] = useState<Record<string, string>>({});
  const [target, setTarget] = useState<FlowTarget | null>(null);
  const [more, setMore] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const autoExpanded = useRef(false);
  const lastId = useRef<number | undefined>(undefined);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const errorsOnly = view === "errors";
  const filterRef = useRef({ categories, errorsOnly });
  filterRef.current = { categories, errorsOnly };

  const matches = useCallback((e: ActivityEvent) => {
    const f = filterRef.current;
    if (f.errorsOnly && e.status !== "error") return false;
    return f.categories.length === 0 || f.categories.includes(categoryOf(e.kind));
  }, []);

  const load = useCallback(async () => {
    try {
      const rows = await listActivity(categories, errorsOnly);
      setEvents(rows);
      setMore(rows.length >= 100);
      setHeld([]);
      if (rows.length) lastId.current = Math.max(lastId.current ?? 0, rows[0].id);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, [categories, errorsOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const loadWaiting = useCallback(() => {
    listWaitingJobs()
      .then(setWaitingJobs)
      .catch((err) => setError(errorText(err)));
  }, []);

  useEffect(() => {
    if (view === "needs") loadWaiting();
  }, [view, loadWaiting]);

  // Summary figures and the chart's day of events refresh together.
  useEffect(() => {
    const tick = () => {
      getActivitySummary().then(setSummary).catch(() => undefined);
      listActivity([], false, undefined, CHART_LIMIT).then(setDayEvents).catch(() => undefined);
    };
    tick();
    const id = setInterval(() => !document.hidden && tick(), SUMMARY_MS);
    return () => clearInterval(id);
  }, []);

  // One stream for the page's lifetime; reconnects from the last id it saw.
  useEffect(() => {
    const ctrl = new AbortController();
    let delay = 1000;
    (async () => {
      while (!ctrl.signal.aborted) {
        try {
          await streamActivity(
            lastId.current,
            {
              onReady: () => {
                delay = 1000;
                setLive(pausedRef.current ? "paused" : "live");
              },
              onEvent: (e) => {
                lastId.current = Math.max(lastId.current ?? 0, e.id);
                setLiveEvents((prev) => [...prev.slice(-LIVE_KEEP), e]);
                const doneJob = e.kind === "job" && e.status !== "running" ? e.refs.job : null;
                if (doneJob) {
                  setLatestStep((m) => {
                    const { [doneJob]: _, ...rest } = m;
                    return rest;
                  });
                }
                if (!matches(e)) return;
                if (pausedRef.current) setHeld((h) => [e, ...h]);
                else setEvents((prev) => (prev && !prev.some((p) => p.id === e.id) ? [e, ...prev] : prev));
              },
              onStep: (s) => {
                setLiveSteps((prev) => [...prev.slice(-LIVE_KEEP), s]);
                const step = stepsFromEvents([{ at: s.at, event: s.event }])[0];
                if (step) setLatestStep((m) => ({ ...m, [s.job]: `${step.label} ${step.detail}`.trim() }));
              },
            },
            ctrl.signal
          );
        } catch {
          // dropped or refused; retried below
        }
        if (ctrl.signal.aborted) break;
        setLive("reconnecting");
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 15_000);
      }
    })();
    return () => ctrl.abort();
  }, [matches]);

  function togglePause() {
    if (paused) {
      setEvents((prev) => {
        const ids = new Set((prev ?? []).map((e) => e.id));
        return [...held.filter((e) => !ids.has(e.id)), ...(prev ?? [])];
      });
      setHeld([]);
      setLive("live");
    } else {
      setLive("paused");
    }
    setPaused(!paused);
  }

  async function loadMore() {
    const oldest = events?.[events.length - 1]?.id;
    if (!oldest) return;
    try {
      const rows = await listActivity(categories, errorsOnly, oldest);
      setEvents((prev) => [...(prev ?? []), ...rows]);
      setMore(rows.length >= 100);
    } catch (err) {
      setError(errorText(err));
    }
  }

  function toggleCategory(c: ActivityCategory) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function clearFilters() {
    setCategories([]);
    setView("all");
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openSession(id: string) {
    useSessionStore.getState().selectSession(id);
    useChatStore.getState().loadSession(id);
    // selectSession has already moved the hub shell to Chat; closeAll would send it back Home.
    if (useShellStore.getState().shell === "old") useUiStore.getState().closeAll();
  }

  const s = summary?.last_24h;
  const now = summary?.now;
  const waitingCount = now ? now.jobs_waiting + now.approvals_pending : 0;
  const filtered = categories.length > 0 || errorsOnly;

  // The chart counts what the stream has added since its last fetch, too.
  const chartEvents = useMemo(() => {
    const ids = new Set(dayEvents.map((e) => e.id));
    return [...liveEvents.filter((e) => !ids.has(e.id)), ...dayEvents];
  }, [dayEvents, liveEvents]);

  const days = useMemo(() => {
    const out: { day: string; runs: Run[] }[] = [];
    for (const run of groupRuns(events ?? [])) {
      const day = dayLabel(run.newestAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.runs.push(run);
      else out.push({ day, runs: [run] });
    }
    return out;
  }, [events]);

  // Open the newest run with steps once, so the page shows what Sazed just did.
  useEffect(() => {
    if (autoExpanded.current || !days.length) return;
    autoExpanded.current = true;
    const first = days[0].runs.find((r) => runSteps(r).length > 0);
    if (first) setExpanded(new Set([first.key]));
  }, [days]);

  const liveTone: Tone = live === "live" ? "ok" : live === "paused" ? "warn" : "neutral";
  const liveLabel =
    live === "live" ? "Live" : live === "paused" ? "Paused" : live === "reconnecting" ? "Reconnecting" : "Connecting";

  return (
    <Page>
      <PageHeader
        title="Activity"
        status={
          <StatusPill tone={liveTone} pulse={live === "live"}>
            {liveLabel}
          </StatusPill>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={togglePause}
            aria-label={paused ? "Resume live updates" : "Pause live updates"}
          >
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            {paused ? "Resume" : "Pause"}
            {paused && held.length > 0 && <span className="text-warn">{held.length} new</span>}
          </Button>
        }
      />

      <PageBody>
        {s && <DayChart events={chartEvents} summary={s} />}

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Show"
            options={[
              { value: "all", label: "Everything" },
              { value: "needs", label: "Needs you", count: waitingCount },
              { value: "errors", label: "Errors", count: s?.errors },
            ]}
            value={view}
            onChange={setView}
          />
          {view !== "needs" && (
            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                {categories.length ? `Type · ${categories.length}` : "Type"}
                <ChevronDown aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-44">
                {(Object.keys(CATEGORY_LABEL) as ActivityCategory[]).map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c}
                    checked={categories.includes(c)}
                    onCheckedChange={() => toggleCategory(c)}
                    className="focus:bg-raised focus:text-ink data-highlighted:bg-raised"
                  >
                    {CATEGORY_LABEL[c]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {view !== "needs" && categories.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCategories([])}>
              Clear
            </Button>
          )}
        </div>

        {error && <p className="text-meta text-err">Couldn't load activity: {error}</p>}

        {view === "needs" ? (
          <WaitingList jobs={waitingJobs} onOpen={setOpenJob} />
        ) : (
          <>
            {!events && !error && <p className="text-meta text-muted">Loading activity…</p>}
            {events &&
              events.length === 0 &&
              (filtered ? (
                <EmptyState title="Nothing matches these filters" action={{ label: "Show everything", onClick: clearFilters }}>
                  Nothing in the loaded history has this type or status.
                </EmptyState>
              ) : (
                <EmptyState title="No activity yet">
                  Chats, automations, jobs and tool calls show up here as they happen.
                </EmptyState>
              ))}

            {days.map(({ day, runs }) => (
              <ListSection key={day} title={day}>
                {runs.map((run) => (
                  <RunRow
                    key={run.key}
                    run={run}
                    expanded={expanded.has(run.key)}
                    step={run.status === "running" && run.head.refs.job ? latestStep[run.head.refs.job] : undefined}
                    onToggle={() => toggleExpanded(run.key)}
                    onOpenFlow={() => setTarget({ trace: run.trace ?? run.head.trace, focusId: run.head.id })}
                  />
                ))}
              </ListSection>
            ))}

            {events && events.length > 0 && more && (
              <Button variant="ghost" size="sm" className="self-start" onClick={loadMore}>
                Load older
              </Button>
            )}
          </>
        )}
      </PageBody>

      <FlowSheet
        target={target}
        liveEvents={liveEvents}
        liveSteps={liveSteps}
        onClose={() => setTarget(null)}
        onOpenSession={openSession}
      />
      <JobSheet jobId={openJob} onClose={() => setOpenJob(null)} onChanged={loadWaiting} onOpenJob={setOpenJob} />
    </Page>
  );
}

/** Status icon for automations (what happened), kind icon for everything else. */
function RunIcon({ run, outcome }: { run: Run; outcome: string | null }) {
  if (run.head.kind === "automation" && outcome) {
    if (outcome.startsWith("Failed")) return <CircleX className="text-err" aria-hidden="true" />;
    if (outcome.startsWith("Skipped")) return <CircleMinus className="text-muted" aria-hidden="true" />;
    if (outcome.startsWith("Sent") || outcome.startsWith("Done")) return <Check className="text-ok" aria-hidden="true" />;
  }
  if (run.head.kind === "backlog") return <CirclePlus className="text-muted" aria-hidden="true" />;
  const Icon = iconFor(run.head.kind);
  return <Icon className={statusTone(run.status)} aria-hidden="true" />;
}

interface RunRowProps {
  run: Run;
  expanded: boolean;
  step?: string;
  onToggle: () => void;
  onOpenFlow: () => void;
}

function RunRow({ run, expanded, step, onToggle, onOpenFlow }: RunRowProps) {
  const { title, outcome, detail } = runText(run);
  const steps = runSteps(run);
  const expandable = steps.length > 0;
  const time = shortClock(run.oldestAt);
  const text = step ?? detail;
  return (
    <>
      <ListRow
        onClick={expandable ? onToggle : run.trace ? onOpenFlow : undefined}
        expanded={expandable ? expanded : undefined}
        time={time}
        leading={<RunIcon run={run} outcome={outcome} />}
        title={title}
        description={
          (outcome || text) && (
            <>
              {outcome && <span className={cn(outcome.startsWith("Failed") && "text-err")}>{outcome}</span>}
              {outcome && text && " "}
              {text}
            </>
          )
        }
        meta={
          <>
            <span className="md:hidden">{time}</span>
            {run.durationMs != null && <span>{duration(run.durationMs)}</span>}
            {run.costUsd > 0 && <span>{usd(run.costUsd)}</span>}
            {run.jobs > 0 && !run.head.kind.startsWith("job") && <span>{run.jobs} jobs</span>}
          </>
        }
      />
      {expandable && expanded && (
        <div className="flex flex-col bg-bg pt-1 pr-3 pb-2.5 pl-11 md:pr-4 md:pl-[132px]">
          {steps.map((st) => (
            <div key={st.label} className="flex items-baseline justify-between gap-3 py-1 text-meta text-ink-2">
              <span className="min-w-0 truncate">{st.label}</span>
              <span className={cn("shrink-0 font-mono text-caption", st.tone === "err" ? "text-err" : "text-muted")}>
                {st.value}
              </span>
            </div>
          ))}
          {run.trace && (
            <button type="button" onClick={onOpenFlow} className="mt-1 self-start text-meta text-primary hover:underline">
              Open timeline
            </button>
          )}
        </div>
      )}
    </>
  );
}

function WaitingList({ jobs, onOpen }: { jobs: JobSummary[] | null; onOpen: (id: string) => void }) {
  if (!jobs) return <p className="text-meta text-muted">Loading…</p>;
  if (jobs.length === 0) {
    return (
      <EmptyState title="Nothing is waiting on you">
        Jobs that need your approval or an answer show up here.
      </EmptyState>
    );
  }
  const Icon = iconFor("job");
  return (
    <ListSection title="Waiting for you">
      {jobs.map((j) => {
        const day = dayLabel(j.created_at);
        const when = `${day === "Today" ? "" : `${day}, `}${shortClock(j.created_at)}`;
        return (
          <ListRow
            key={j.id}
            onClick={() => onOpen(j.id)}
            time={day === "Today" ? shortClock(j.created_at) : day}
            leading={<Icon className="text-warn" aria-hidden="true" />}
            title={j.title}
            description={`${STATUS_LABEL[j.status]} · ${KIND_LABEL[j.kind]}`}
            meta={<span className="md:hidden">{when}</span>}
          />
        );
      })}
    </ListSection>
  );
}
