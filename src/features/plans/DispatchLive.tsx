import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { getDispatchPlan, type DispatchPlan } from "@/api/dispatch";
import { errorText } from "@/api/homelab";
import { StatusPill } from "@/components/system";
import { MiniRow, SystemBox, TaskCard } from "./DispatchCards";
import { DispatchEdges } from "./DispatchEdges";
import { DispatchPanel } from "./DispatchPanel";
import { columnOf, costOf, dollars, isSettled, stateOf, type Column } from "./dispatchRun";
import { syncServerClock } from "./useNow";

const POLL_MS = 3000;

function usePlan(plan: string) {
  const [data, setData] = useState<DispatchPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const settled = data ? isSettled(data.tasks) : false;

  useEffect(() => {
    setData(null);
  }, [plan]);

  useEffect(() => {
    let live = true;
    const load = () =>
      getDispatchPlan(plan)
        .then((p) => live && (syncServerClock(p.now), setData(p), setError(null)))
        .catch((err) => live && setError(errorText(err)));
    load();
    if (settled) return () => void (live = false);
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [plan, settled]);

  return { data, error };
}

function ColumnHead({ label, count }: { label: string; count?: number }) {
  return (
    <h3 className="mb-2 flex gap-1.5 text-caption text-muted">
      {label}
      {count !== undefined && <span className="font-mono">{count}</span>}
    </h3>
  );
}

const Empty = ({ children }: { children: string }) => <p className="text-caption text-muted">{children}</p>;

export function DispatchLive({ plan, onBack }: { plan: string; onBack: () => void }) {
  const { data, error } = usePlan(plan);
  const hostRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const prevColumns = useRef(new Map<string, Column>());

  const tasks = useMemo(() => data?.tasks ?? [], [data]);
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const columns = useMemo(() => new Map(tasks.map((t) => [t.id, columnOf(t)])), [tasks]);
  const fresh = new Set(
    tasks.filter((t) => prevColumns.current.has(t.id) && prevColumns.current.get(t.id) !== columns.get(t.id)).map((t) => t.id)
  );
  useEffect(() => {
    prevColumns.current = columns;
  }, [columns]);

  const inColumn = (c: Column) => tasks.filter((t) => columns.get(t.id) === c);
  const landed = inColumn("landed");
  const working = inColumn("working");
  const landing = inColumn("landing");
  const next = inColumn("next");
  const allLanded = tasks.length > 0 && landed.length === tasks.length;
  const active = tasks.find((t) => ["running", "waiting"].includes(stateOf(t)));
  const selected = (picked && byId.get(picked)) || active || tasks[0];
  const spent = tasks.reduce((sum, t) => sum + costOf(t), 0);
  const select = (id: string) => setPicked(id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-meta text-muted hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Dispatch runs
        </button>
        <span className="text-muted">/</span>
        <h2 className="font-mono text-title font-semibold text-ink">{plan}</h2>
        {data && (
          <StatusPill tone={allLanded ? "ok" : "accent"} pulse={!allLanded}>
            {allLanded ? "all landed" : "running"}
          </StatusPill>
        )}
      </div>
      {error && <p className="text-meta text-err">Couldn't load this run: {error}</p>}
      {!data && !error && <p className="text-meta text-muted">Loading…</p>}
      {data && (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-meta text-ink-2">
            <span>
              <b className="font-medium text-ink">
                {landed.length}/{tasks.length}
              </b>{" "}
              landed
            </span>
            <span>
              <b className="font-medium text-ink">{working.length}</b> working
            </span>
            <span>
              <b className="font-medium text-ink">{dollars(spent)}</b> spent
            </span>
            <span>
              {data.repo} · onto <span className="font-mono">integ/{data.plan}</span>
            </span>
            <span className="font-mono">{data.host}</span>
          </div>
          <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div ref={hostRef} className="relative min-w-0 overflow-hidden rounded-lg border border-line bg-surface px-3.5 py-3">
              <DispatchEdges hostRef={hostRef} tasks={tasks} />
              <div className="relative grid grid-cols-1 items-start gap-4 min-[760px]:grid-cols-[minmax(0,0.8fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] min-[760px]:gap-7">
                <div>
                  <ColumnHead label="Landed" count={landed.length} />
                  {landed.length ? (
                    landed.map((t) => <MiniRow key={t.id} task={t} selected={t.id === selected?.id} onSelect={select} />)
                  ) : (
                    <Empty>Nothing yet.</Empty>
                  )}
                </div>
                <div>
                  <ColumnHead label="Working" count={working.length} />
                  <div className="flex flex-col gap-2">
                    {working.length ? (
                      working.map((t) => (
                        <TaskCard key={t.id} task={t} byId={byId} selected={t.id === selected?.id} fresh={fresh.has(t.id)} onSelect={select} />
                      ))
                    ) : (
                      <Empty>Nothing running.</Empty>
                    )}
                  </div>
                </div>
                <div>
                  <ColumnHead label="Landing" />
                  <div className="flex flex-col gap-2">
                    <SystemBox title="Integrator" tag={landing.length > 0}>
                      {landing.length ? `Rebasing ${landing.length}, then the check.` : "Idle."}
                    </SystemBox>
                    {landing.map((t) => (
                      <TaskCard key={t.id} task={t} byId={byId} selected={t.id === selected?.id} fresh={fresh.has(t.id)} onSelect={select} />
                    ))}
                    <SystemBox node="integ" title={`integ/${data.plan}`} mono>
                      {`${landed.length} landed. ${allLanded ? "Draft PR opens on export." : "Draft PR when all land."}`}
                    </SystemBox>
                  </div>
                </div>
                <div>
                  <ColumnHead label="Next" count={next.length} />
                  <div className="flex flex-col gap-2">
                    {next.length ? (
                      next.map((t) => (
                        <TaskCard key={t.id} task={t} byId={byId} selected={t.id === selected?.id} fresh={fresh.has(t.id)} onSelect={select} />
                      ))
                    ) : (
                      <Empty>Nothing queued.</Empty>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {selected && <DispatchPanel task={selected} />}
          </div>
        </>
      )}
    </div>
  );
}
