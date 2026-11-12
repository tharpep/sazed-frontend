import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { DetailPanel } from "@/components/shell/DetailPanel";
import { getActivityEvent, getFlow, type ActivityEvent, type ActivityFlow, type StepEvent } from "@/api/activity";
import { errorText } from "@/api/homelab";
import { stepsFromEvents } from "@/features/jobs/format";
import { FlowRow } from "./FlowRow";
import { clock, ms, usd } from "./format";

export interface FlowTarget {
  trace: string | null;
  focusId: number;
}

interface Props {
  target: FlowTarget | null;
  /** Live events and job steps the page received; the sheet picks the ones in its flow. */
  liveEvents: ActivityEvent[];
  liveSteps: StepEvent[];
  onClose: () => void;
  onOpenSession: (id: string) => void;
}

interface Segment {
  header: ActivityEvent | null;
  events: ActivityEvent[];
}

const ACTIVE = new Set(["running", "pending"]);

function startOf(e: ActivityEvent): number {
  return Date.parse(e.at) - (e.duration_ms ?? 0);
}

/** Chats split into turns at each message from Pryce; other flows are one segment. */
function segment(events: ActivityEvent[]): Segment[] {
  const out: Segment[] = [{ header: null, events: [] }];
  for (const e of events) {
    if (e.kind === "chat.user") out.push({ header: e, events: [] });
    else out[out.length - 1].events.push(e);
  }
  return out.filter((s) => s.header || s.events.length);
}

function depthOf(e: ActivityEvent, rootTrace: string): number {
  if (e.kind === "llm" || e.kind === "tool" || e.kind === "approval") return 1;
  if (e.kind.startsWith("job") && !rootTrace.startsWith("job:") && !rootTrace.startsWith("item:")) return 1;
  return 0;
}

export function FlowSheet({ target, liveEvents, liveSteps, onClose, onOpenSession }: Props) {
  const [flow, setFlow] = useState<ActivityFlow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSegments, setOpenSegments] = useState<Set<number>>(new Set());
  const [openSteps, setOpenSteps] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0); // re-renders running bars against "now"

  // Reset in the same render the target changes, so nothing of the last flow paints under the new
  // one (or opens its session).
  const [stateFor, setStateFor] = useState(target);
  if (stateFor !== target) {
    setStateFor(target);
    setFlow(null);
    setError(null);
    setOpenSegments(new Set());
    setOpenSteps(new Set());
  }

  // From 1180px the panel is inline and the list stays clickable, so a slow answer for the last run
  // can land after another run was picked; only the latest request may set state.
  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    if (!target) return;
    const seq = ++loadSeq.current;
    try {
      const next: ActivityFlow =
        target.trace && !target.trace.startsWith("gw:")
          ? await getFlow(target.trace)
          : { trace: target.trace ?? "", traces: [], events: [await getActivityEvent(target.focusId)], steps: {} };
      if (seq !== loadSeq.current) return;
      setFlow(next);
      setError(null);
    } catch (err) {
      if (seq === loadSeq.current) setError(errorText(err));
    }
  }, [target]);

  useEffect(() => {
    load();
    return () => {
      loadSeq.current++;
    };
  }, [load]);

  // Live: refetch (debounced) when an event lands in this flow, or one that may link to it.
  const ids = useMemo(() => {
    const s = new Set<string>();
    for (const t of flow?.traces ?? []) s.add(t.split(":").slice(1).join(":"));
    for (const e of flow?.events ?? []) for (const v of Object.values(e.refs)) if (v) s.add(String(v));
    return s;
  }, [flow]);
  const seenLive = useRef(0);
  useEffect(() => {
    if (!flow || !target?.trace) return;
    const fresh = liveEvents.slice(seenLive.current);
    seenLive.current = liveEvents.length;
    const relevant = fresh.some(
      (e) => (e.trace && flow.traces.includes(e.trace)) || Object.values(e.refs).some((v) => v && ids.has(String(v)))
    );
    if (!relevant) return;
    const id = setTimeout(load, 1200);
    return () => clearTimeout(id);
  }, [liveEvents, flow, ids, load, target]);

  const events = flow?.events ?? [];
  const running = events.some((e) => ACTIVE.has(e.status));
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Job steps: what's stored plus what streamed in since.
  const steps = useMemo(() => {
    const out: Record<string, { at: string; event: Record<string, unknown> }[]> = { ...(flow?.steps ?? {}) };
    for (const s of liveSteps) {
      const list = out[s.job];
      if (!list && !ids.has(s.job)) continue;
      const last = list?.[list.length - 1]?.at;
      if (!last || s.at > last) out[s.job] = [...(list ?? []), { at: s.at, event: s.event }];
    }
    return out;
  }, [flow, liveSteps, ids]);

  const rootTrace = target?.trace ?? "";
  const start = events.length ? Math.min(...events.map(startOf)) : 0;
  const end = events.length ? Math.max(...events.map((e) => Date.parse(e.at)), running ? Date.now() : 0) : 0;
  const span = Math.max(end - start, 1);
  const segments = segment(events);
  const focusSeg = segments.findIndex(
    (s) => s.header?.id === target?.focusId || s.events.some((e) => e.id === target?.focusId)
  );
  const defaultOpen = focusSeg >= 0 ? focusSeg : segments.length - 1;
  const cost = events.reduce((sum, e) => sum + (e.cost_usd ?? 0), 0);
  const errors = events.filter((e) => e.status === "error").length;
  const title = events.find((e) => e.kind === "chat.user" || e.kind === "automation" || e.kind === "backlog")?.title
    ?? events[0]?.title ?? "Flow";
  const session = events.find((e) => e.refs.session)?.refs.session;
  // The job row that carries a job's steps: its "started" event, else its first event.
  const stepAnchor = new Map<string, number>();
  for (const e of events) {
    const job = e.refs.job;
    if (!job || !e.kind.startsWith("job")) continue;
    if (!stepAnchor.has(job) || (e.status === "running" && e.kind === "job")) stepAnchor.set(job, e.id);
  }

  function toggle<T>(set: Set<T>, value: T, update: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    update(next);
  }

  function renderEvent(e: ActivityEvent) {
    const job = e.refs.job;
    const jobSteps = job && stepAnchor.get(job) === e.id ? stepsFromEvents(steps[job]) : [];
    const stepsOpen = job ? openSteps.has(job) : false;
    const shown = stepsOpen ? jobSteps : jobSteps.slice(-3);
    const depth = depthOf(e, rootTrace);
    return (
      <div key={e.id}>
        <FlowRow
          event={e}
          depth={depth}
          bar={{ left: (startOf(e) - start) / span, width: (e.duration_ms ?? 0) / span }}
          offsetMs={Date.parse(e.at) - start}
          focused={e.id === target?.focusId}
          onOpenSession={onOpenSession}
        />
        {jobSteps.length > 0 && (
          <div style={{ paddingLeft: (depth + 1) * 14 + 10 }} className="flex flex-col gap-0.5 py-0.5">
            {jobSteps.length > 3 && (
              <button
                type="button"
                onClick={() => toggle(openSteps, job!, setOpenSteps)}
                className="self-start text-[11px] text-primary hover:underline"
              >
                {stepsOpen ? "Show fewer steps" : `All ${jobSteps.length} steps`}
              </button>
            )}
            {shown.map((s, i) => (
              <p key={i} className="flex gap-2 text-[11px]">
                <span className="w-14 shrink-0 text-muted">{s.label}</span>
                <span className="min-w-0 truncate text-ink">{s.detail}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <DetailPanel
      open={target !== null}
      onClose={onClose}
      title={<span className="line-clamp-2">{title}</span>}
      description={
        events.length > 0 && (
          <>
            {[
              clock(new Date(start).toISOString()),
              running ? `running ${ms(Date.now() - start)}` : ms(end - start),
              `${events.length} events`,
              cost > 0 ? usd(cost) : "",
            ]
              .filter(Boolean)
              .join(" · ")}
            {errors > 0 && <span className="text-destructive"> · {errors} failed</span>}
          </>
        )
      }
    >
      <div className="-mx-1.5 flex flex-col gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!flow && !error && <p className="text-sm text-muted">Loading…</p>}
        {session && (
          <button
            type="button"
            onClick={() => onOpenSession(session)}
            className="self-start text-xs text-primary hover:underline"
          >
            Open the conversation in chat
          </button>
        )}
        {segments.map((seg, i) => {
          const isOpen = openSegments.has(i) !== (i === defaultOpen);
          if (!seg.header) return <ul key={i} className="flex flex-col">{seg.events.map(renderEvent)}</ul>;
          return (
            <section key={i} className="flex flex-col rounded-lg border border-border">
              <button
                type="button"
                onClick={() => toggle(openSegments, i, setOpenSegments)}
                className="flex items-center gap-2 px-2 py-1.5 text-left hover:bg-surface"
              >
                {isOpen ? <ChevronDown className="size-3.5 text-muted" /> : <ChevronRight className="size-3.5 text-muted" />}
                <span title={seg.header.title} className="min-w-0 flex-1 truncate text-xs text-ink">
                  {seg.header.title}
                </span>
                <span className="shrink-0 text-[11px] text-muted">
                  {clock(seg.header.at)} · {seg.events.length} events
                </span>
              </button>
              {isOpen && <ul className="flex flex-col px-1 pb-1">{[seg.header, ...seg.events].map(renderEvent)}</ul>}
            </section>
          );
        })}
      </div>
    </DetailPanel>
  );
}
