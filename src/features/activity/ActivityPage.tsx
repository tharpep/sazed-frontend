import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";
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
import { stepsFromEvents } from "@/features/jobs/format";
import { useChatStore } from "@/store/chatStore";
import { useSessionStore } from "@/store/sessionStore";
import { useUiStore } from "@/store/uiStore";
import { FlowSheet, type FlowTarget } from "./FlowSheet";
import {
  CATEGORY_LABEL,
  categoryOf,
  clock,
  dayLabel,
  iconFor,
  ms,
  originLabel,
  statusDot,
  statusTone,
  usd,
} from "./format";

type Live = "connecting" | "live" | "reconnecting" | "paused";

const LIVE_KEEP = 2000; // live events kept in memory for open flows
const SUMMARY_MS = 30_000;

export function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [live, setLive] = useState<Live>("connecting");
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState<ActivityEvent[]>([]);
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);
  const [liveSteps, setLiveSteps] = useState<StepEvent[]>([]);
  const [latestStep, setLatestStep] = useState<Record<string, string>>({});
  const [target, setTarget] = useState<FlowTarget | null>(null);
  const [more, setMore] = useState(true);
  const lastId = useRef<number | undefined>(undefined);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
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

  useEffect(() => {
    const tick = () => getActivitySummary().then(setSummary).catch(() => undefined);
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

  function openSession(id: string) {
    useSessionStore.getState().selectSession(id);
    useChatStore.getState().loadSession(id);
    useUiStore.getState().closeAll();
  }

  const s = summary?.last_24h;
  const now = summary?.now;
  let lastDay = "";

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-ink">Activity</h1>
          <span className="flex items-center gap-1.5 text-xs text-muted" role="status">
            <span
              className={cn(
                "size-1.5 rounded-full",
                live === "live" ? "animate-pulse bg-primary" : live === "paused" ? "bg-accent" : "bg-border"
              )}
              aria-hidden="true"
            />
            {live === "live" ? "Live" : live === "paused" ? "Paused" : live === "reconnecting" ? "Reconnecting…" : "Connecting…"}
          </span>
        </div>
        <button
          type="button"
          onClick={togglePause}
          aria-label={paused ? "Resume live updates" : "Pause live updates"}
          title={paused ? "Resume" : "Pause"}
          className="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
          {paused && held.length > 0 && <span className="text-xs text-accent">{held.length} new</span>}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {s && now && (
            <section aria-label="Summary" className="flex flex-col gap-1.5 text-xs text-muted">
              <p>
                <span className="text-ink">Last 24 hours:</span>{" "}
                {[
                  `${s.chat_messages} messages`,
                  `${s.llm_calls} model calls (${usd(s.cost_usd)})`,
                  `${s.tool_calls} tool calls`,
                  `${s.jobs} jobs`,
                  `${s.notifications} Pushovers`,
                ].join(" · ")}
                {s.errors > 0 && <span className="text-destructive"> · {s.errors} errors</span>}
              </p>
              <p>
                <span className="text-ink">Now:</span>{" "}
                {[
                  now.jobs_running ? `${now.jobs_running} job running` : "",
                  now.jobs_queued ? `${now.jobs_queued} queued` : "",
                  now.runs_running ? `${now.runs_running} automation running` : "",
                ]
                  .filter(Boolean)
                  .join(" · ") || "idle"}
                {(now.jobs_waiting > 0 || now.approvals_pending > 0) && (
                  <span className="text-accent">
                    {" "}
                    · {now.jobs_waiting + now.approvals_pending} waiting for you
                  </span>
                )}
              </p>
            </section>
          )}

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
            <button
              type="button"
              aria-pressed={categories.length === 0 && !errorsOnly}
              onClick={() => {
                setCategories([]);
                setErrorsOnly(false);
              }}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                categories.length === 0 && !errorsOnly ? "border-primary bg-primary/10 text-ink" : "border-border text-muted hover:text-ink"
              )}
            >
              All
            </button>
            {(Object.keys(CATEGORY_LABEL) as ActivityCategory[]).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={categories.includes(c)}
                onClick={() => toggleCategory(c)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  categories.includes(c) ? "border-primary bg-primary/10 text-ink" : "border-border text-muted hover:text-ink"
                )}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={errorsOnly}
              onClick={() => setErrorsOnly((v) => !v)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                errorsOnly ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted hover:text-ink"
              )}
            >
              Errors
            </button>
          </div>

          {error && <p className="text-sm text-destructive">Couldn't load activity: {error}</p>}
          {!events && !error && <p className="text-sm text-muted">Loading…</p>}
          {events && events.length === 0 && <p className="px-1 text-sm text-muted">Nothing yet.</p>}
          {events && events.length > 0 && (
            <ul className="flex flex-col">
              {events.map((e) => {
                const day = dayLabel(e.at);
                const showDay = day !== lastDay;
                lastDay = day;
                const Icon = iconFor(e.kind);
                const job = e.refs.job;
                const step = e.status === "running" && job ? latestStep[job] : undefined;
                const facts = [
                  clock(e.at),
                  originLabel(e),
                  ms(e.duration_ms),
                  e.kind === "llm" ? usd(e.cost_usd) : "",
                ].filter(Boolean);
                return (
                  <li key={e.id}>
                    {showDay && <h2 className="px-1 pt-3 pb-1 text-xs font-medium text-muted">{day}</h2>}
                    <button
                      type="button"
                      onClick={() => setTarget({ trace: e.trace, focusId: e.id })}
                      className="flex w-full items-start gap-2.5 rounded-md px-1.5 py-2 text-left transition-colors hover:bg-surface"
                    >
                      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", statusDot(e.status))} aria-hidden="true" />
                      <Icon className={cn("mt-0.5 size-4 shrink-0", statusTone(e.status))} aria-hidden="true" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm text-ink">{e.title}</span>
                        <span className="truncate text-xs text-muted">{facts.join(" · ")}</span>
                        {step && <span className="truncate text-xs text-primary">{step}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {events && events.length > 0 && more && (
            <button type="button" onClick={loadMore} className="self-center text-sm text-primary hover:underline">
              Load older
            </button>
          )}
        </div>
      </div>

      <FlowSheet
        target={target}
        liveEvents={liveEvents}
        liveSteps={liveSteps}
        onClose={() => setTarget(null)}
        onOpenSession={openSession}
      />
    </div>
  );
}
