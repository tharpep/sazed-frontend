import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

import type { UsageLimits, UsageSession } from "@/api/claudeUsage";
import { cn } from "@/lib/utils";
import { dollars, modelName, projectName, sessionLabel, shortDate, tokens } from "./format";
import { SessionChart } from "./SessionChart";

const MIN_PROMPTS = 5;
const PALETTE = [
  "var(--color-primary)",
  "var(--color-ok)",
  "color-mix(in oklch, var(--color-primary) 50%, var(--color-ok))",
  "color-mix(in oklch, var(--color-warn) 60%, var(--color-ink))",
  "var(--color-ink-2)",
  "var(--color-muted)",
];

const GRID = "grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-x-3 gap-y-1 md:grid-cols-[15rem_minmax(0,1fr)_2.5rem]";

interface Scale {
  max: number;
  pct: (value: number) => string;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-caption text-muted">{label}</dt>
      <dd className="text-meta text-ink tabular-nums">{value}</dd>
    </div>
  );
}

function Detail({ session, limits }: { session: UsageSession; limits: UsageLimits }) {
  return (
    <div className="flex flex-col gap-3 px-3 pb-3 md:px-4">
      <SessionChart session={session} limits={limits} />
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        <Fact label="Model" value={session.main_model ? modelName(session.main_model) : "—"} />
        <Fact label="Cost" value={dollars(session.cost_usd)} />
        <Fact label="Side calls" value={dollars(session.side_cost_usd)} />
        <Fact label="Subagents" value={`${session.subagents} · ${dollars(session.subagent_cost_usd)}`} />
        <Fact label="Compactions" value={String(session.compactions)} />
        <Fact label="Interrupts" value={String(session.interrupts)} />
        <Fact label="Confused prompts" value={String(session.confused_prompts.length)} />
        <Fact label="Peak context" value={tokens(session.peak_context)} />
        <Fact label="Machine" value={session.machine} />
      </dl>
    </div>
  );
}

function Row({
  session,
  limits,
  scale,
  color,
  open,
  onToggle,
}: {
  session: UsageSession;
  limits: UsageLimits;
  scale: Scale;
  color: string;
  open: boolean;
  onToggle: () => void;
}) {
  const name = sessionLabel(session.title, session.project);
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(GRID, "w-full px-3 py-2 text-left transition-colors hover:bg-raised/60 focus-visible:-outline-offset-2 md:px-4")}
      >
        <span className="col-span-2 flex min-w-0 items-baseline gap-2 md:col-span-1">
          <ChevronRight className={cn("size-3.5 shrink-0 self-center text-muted transition-transform", open && "rotate-90")} aria-hidden="true" />
          <span className="shrink-0 font-mono text-caption text-muted">{shortDate(session.first_ts)}</span>
          <span className="truncate text-meta text-ink">{name}</span>
        </span>
        <span className="relative block h-6" aria-label={`Peak ${tokens(session.peak_context)}`}>
          <span
            className="absolute top-1/2 left-0 h-2.5 -translate-y-1/2 rounded-r-[2px]"
            style={{ width: scale.pct(session.peak_context), backgroundColor: color }}
          />
          <span className="absolute inset-y-0 border-l border-dashed border-warn" style={{ left: scale.pct(limits.context_soft) }} />
          <span className="absolute inset-y-0 border-l border-dashed border-err" style={{ left: scale.pct(limits.context_hard) }} />
          {session.confused_prompts.map((c) => (
            <span
              key={c.ts}
              title={`Confused prompt at ${tokens(c.context)}`}
              className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-err"
              style={{ left: scale.pct(c.context) }}
            />
          ))}
        </span>
        <span className="text-right font-mono text-caption text-ink-2 tabular-nums">{session.prompts}</span>
      </button>
      {open && <Detail session={session} limits={limits} />}
    </div>
  );
}

export function Timeline({ sessions, limits }: { sessions: UsageSession[]; limits: UsageLimits }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [showShort, setShowShort] = useState(false);

  const { long, short, scale, colors, projects } = useMemo(() => {
    const largest = Math.max(0, ...sessions.map((s) => s.peak_context));
    const max = Math.max(largest, limits.context_hard * 1.1);
    const names = [...new Set(sessions.map((s) => projectName(s.project)))].sort();
    const colorOf = new Map(names.map((n, i) => [n, PALETTE[i % PALETTE.length]]));
    return {
      long: sessions.filter((s) => s.prompts >= MIN_PROMPTS),
      short: sessions.filter((s) => s.prompts < MIN_PROMPTS),
      scale: { max, pct: (v: number) => `${((v / max) * 100).toFixed(2)}%` },
      colors: colorOf,
      projects: names,
    };
  }, [sessions, limits]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const rowFor = (s: UsageSession) => (
    <Row
      key={s.session_id}
      session={s}
      limits={limits}
      scale={scale}
      color={colors.get(projectName(s.project)) ?? PALETTE[0]}
      open={openIds.has(s.session_id)}
      onToggle={() => toggle(s.session_id)}
    />
  );

  const shortPrompts = short.reduce((n, s) => n + s.prompts, 0);

  return (
    <section aria-label="Session timeline" className="flex flex-col gap-1.5">
      <h2 className="px-0.5 text-meta text-muted">Sessions by peak context</h2>
      <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-line px-3 py-2 text-caption text-muted md:px-4">
          {projects.map((p) => (
            <span key={p} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-[2px]" style={{ backgroundColor: colors.get(p) }} aria-hidden="true" />
              {p}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 rounded-full bg-err" aria-hidden="true" />
            confused prompt
          </span>
          <span>count at right = prompts</span>
        </div>
        <div className={cn(GRID, "px-3 pt-2 md:px-4")} aria-hidden="true">
          <span className="hidden md:block" />
          <span className="relative block h-4 font-mono text-[10.5px] text-muted">
            <span className="absolute left-0">0</span>
            <span className="absolute -translate-x-1/2 text-warn" style={{ left: scale.pct(limits.context_soft) }}>
              {tokens(limits.context_soft)}
            </span>
            <span className="absolute -translate-x-1/2 text-err" style={{ left: scale.pct(limits.context_hard) }}>
              {tokens(limits.context_hard)}
            </span>
            <span className="absolute right-0">{tokens(Math.round(scale.max))}</span>
          </span>
          <span />
        </div>
        <div className="flex flex-col divide-y divide-line">
          {long.map(rowFor)}
          {short.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowShort((v) => !v)}
                aria-expanded={showShort}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-meta text-ink-2 transition-colors hover:bg-raised/60 focus-visible:-outline-offset-2 md:px-4"
              >
                <ChevronRight className={cn("size-3.5 shrink-0 text-muted transition-transform", showShort && "rotate-90")} aria-hidden="true" />
                <span>
                  {short.length} short sessions under {MIN_PROMPTS} prompts
                </span>
                <span className="ml-auto font-mono text-caption text-muted tabular-nums">{shortPrompts}</span>
              </button>
              {showShort && <div className="flex flex-col divide-y divide-line border-t border-line">{short.map(rowFor)}</div>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
