import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import type { SessionAgent } from "@/api/sessions";
import { DetailPanel } from "@/components/shell/DetailPanel";
import { cn } from "@/lib/utils";
import { sessionLabel } from "@/widgets/projectWork";

import { useSessionDetail } from "./sessionDetail";
import { agentLine, agentName, stepText, visibleSteps } from "./sessions";
import { clockOf } from "./shipped";

export function HostChip({ host }: { host: string | null }) {
  if (!host) return null;
  return (
    <span
      title={host}
      className="inline-block max-w-[16ch] truncate rounded-[5px] border border-line px-1.5 align-bottom font-mono text-[11px] leading-[18px] text-ink-2"
    >
      {host}
    </span>
  );
}

/** A spinner while running, a tick once done, a hollow ring otherwise. */
export function RunGlyph({ state, warn = false }: { state: string; warn?: boolean }) {
  if (warn) return <span aria-hidden="true" className="size-[9px] rounded-full border-[1.5px] border-warn" />;
  if (state === "running")
    return (
      <span
        aria-hidden="true"
        className="size-[11px] animate-spin rounded-full border-[1.5px] border-line border-t-ink motion-reduce:animate-none"
      />
    );
  if (state === "done") return <span aria-hidden="true" className="text-meta leading-none text-muted">✓</span>;
  return <span aria-hidden="true" className="size-[9px] rounded-full border-[1.5px] border-muted" />;
}

/** One row per agent, each a tap target that opens its steps. */
export function AgentRows({
  agents,
  onOpen,
  className,
}: {
  agents: readonly SessionAgent[];
  onOpen: (agent: SessionAgent) => void;
  className?: string;
}) {
  if (agents.length === 0) return null;
  return (
    <ul aria-label="Agents" className={cn("border-l border-line", className)}>
      {agents.map((agent) => (
        <li key={agent.agent_id ?? "main"}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(agent);
            }}
            className="grid min-h-11 w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-2 rounded-r-md py-1 pr-1 pl-2 text-left hover:bg-surface sm:min-h-9"
          >
            <span className="flex justify-center">
              <RunGlyph state={agent.state} />
            </span>
            <span className="min-w-0 truncate text-meta">
              <span className="font-medium text-ink">{agentName(agent)}</span>{" "}
              <span className="text-ink-2">{agentLine(agent)}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-3.5 text-muted" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** An agent's steps, newest last, with the older ones folded behind one button. */
export function AgentStepList({ agent }: { agent: SessionAgent }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [agent.agent_id]);
  const { earlier, rows } = visibleSteps(agent.steps, expanded);
  if (agent.steps.length === 0) return <p className="text-meta text-muted">No steps kept for this agent.</p>;
  return (
    <div className="flex flex-col">
      {earlier > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="order-last min-h-11 rounded-md text-meta text-muted hover:bg-surface hover:text-ink sm:min-h-8"
        >
          Show {earlier} earlier {earlier === 1 ? "step" : "steps"}
        </button>
      )}
      <ol className="divide-y divide-line">
        {rows.map((step, i) => {
          const { head, target, line } = stepText(step);
          const now = agent.state === "running" && i === rows.length - 1;
          return (
            <li key={`${step.ts}:${step.seq}`} className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-2 py-2">
              <span className="font-mono text-caption text-muted tabular-nums" title={now ? clockOf(step.at) : undefined}>
                {now ? "now" : clockOf(step.at)}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-3 text-meta [overflow-wrap:anywhere] text-ink" title={target || undefined}>
                  <span className="font-medium">{head}</span>
                  {target && <span className="ml-1.5 font-mono text-[12px]">{target}</span>}
                </span>
                {line && (
                  <span className={cn("block text-caption [overflow-wrap:anywhere]", step.error ? "text-err" : "text-muted")}>
                    {line}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The steps of one agent of a session, opened from its row (mockup h-agent). It opens on the tap,
 * with a loading line until the session's detail arrives. */
export function AgentStepsSheet({
  open,
  onClose,
}: {
  /** null is closed; agent null is the main thread. */
  open: { session: string; agent: string | null } | null;
  onClose: () => void;
}) {
  const { detail, error } = useSessionDetail(open?.session ?? null);
  const agent = open ? (detail?.agents.find((a) => a.agent_id === open.agent) ?? null) : null;
  return (
    <DetailPanel
      open={open !== null}
      title={agent ? agentName(agent) : open?.agent === null ? "Main thread" : "Agent"}
      description="Agent steps, newest last"
      onClose={onClose}
    >
      {detail && (
        <p className="text-caption [overflow-wrap:anywhere] text-muted">
          {agent?.agent_id ? "Agent under " : ""}Claude Code session {sessionLabel(detail.session_id)}
          {detail.host && (
            <>
              {" · "}
              <HostChip host={detail.host} />
            </>
          )}
          {detail.card && ` · ${detail.card.title}`}
        </p>
      )}
      {agent ? (
        <AgentStepList agent={agent} />
      ) : (
        <p className="text-meta text-muted">
          {detail
            ? "This agent's steps are no longer kept."
            : error === "gone"
              ? "Sazed no longer has this session."
              : error
                ? "Couldn't load this session's steps. Trying again shortly."
                : "Loading the steps…"}
        </p>
      )}
      <p className="text-caption text-muted">Steps only: tool, target, one result line. The full transcript stays in Claude.</p>
    </DetailPanel>
  );
}
