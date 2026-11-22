import { useEffect, useState } from "react";

import type { SessionLink } from "@/api/projects";
import { getSession, type SessionDetail } from "@/api/sessions";
import { cn } from "@/lib/utils";
import { AgentRows, AgentStepList, HostChip, RunGlyph } from "@/features/home/AgentSteps";
import { agentName, heardOf, isWarn, sourceWord, statusWord } from "@/features/home/sessions";
import { clockOf } from "@/features/home/shipped";
import { sessionLabel } from "@/widgets/projectWork";

const POLL_MS = 10_000;

/** What the card's live session is doing now, and its agents (mockup h-sheet-live). Absent for a
 * card with no reporting session, so an older Sazed shows the sheet as before. */
export function SessionNow({ link }: { link: SessionLink }) {
  const id = link.session_id ?? null;
  const ended = link.session_status === "ended";
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [picked, setPicked] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setDetail(null);
    setPicked(undefined);
    if (!id || ended) return;
    let live = true;
    const load = () => {
      if (document.hidden) return;
      getSession(id).then(
        (d) => live && setDetail(d),
        () => undefined
      );
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [id, ended]);

  if (!id) return null;
  const status = detail?.status ?? link.session_status ?? "";
  const heard = heardOf(detail?.last_heard_at ?? link.last_heard_at, status);
  const doing = detail?.doing ?? link.doing;

  if (ended) {
    return (
      <p className="text-meta text-muted">
        Claude Code session {sessionLabel(id)} ended · {heard.text}
      </p>
    );
  }

  const word = statusWord(status);
  const agent = picked === undefined ? null : (detail?.agents.find((a) => a.agent_id === picked) ?? null);
  return (
    <section aria-label="Now" className="flex flex-col gap-1.5">
      <h3 className="text-sm font-medium text-ink">Now</h3>
      <div className="grid grid-cols-[18px_minmax(0,1fr)] items-start gap-x-2">
        <span className="flex h-5 items-center justify-center">
          <RunGlyph state={status} warn={isWarn(status)} />
        </span>
        <p className="text-body [overflow-wrap:anywhere] text-ink">
          <span className="font-medium">{doing || (word ? `Session ${word}` : "Working")}</span>
          {doing && sourceWord(detail?.doing_source) && <span className="text-meta text-muted"> · {sourceWord(detail?.doing_source)}</span>}
        </p>
      </div>
      <p className="text-caption [overflow-wrap:anywhere] text-muted">
        Claude Code session {sessionLabel(id)}
        {detail?.host && (
          <>
            {" · "}
            <HostChip host={detail.host} />
          </>
        )}
        {detail && ` · started ${clockOf(detail.started_at)}`}
        {word && word !== "not heard from" && ` · ${word}`}
        {" · "}
        <span className={cn(heard.warn && "text-warn")}>
          {heard.warn && "not heard from, "}
          {heard.text.replace(/^last /, "")}
        </span>
      </p>
      {detail?.question && (
        <div className="rounded-[10px] border border-warn/70 px-3 py-2.5">
          <p className="text-meta font-medium text-warn">Needs you</p>
          <p className="text-meta [overflow-wrap:anywhere] text-ink">{detail.question.text || "A question is waiting in the terminal."}</p>
          <p className="mt-0.5 text-caption text-muted">Asked {clockOf(detail.question.asked_at)}. Answer it in Claude Code.</p>
        </div>
      )}
      {detail && (
        <AgentRows
          agents={detail.agents}
          onOpen={(a) => setPicked((cur) => (cur === a.agent_id ? undefined : a.agent_id))}
          className="ml-2"
        />
      )}
      {agent && (
        <div className="mt-1 rounded-lg border border-line px-3 py-1.5">
          <p className="pt-1 text-meta font-medium text-ink">
            {agentName(agent)} <span className="font-normal text-muted">steps, newest last</span>
          </p>
          <AgentStepList agent={agent} />
        </div>
      )}
    </section>
  );
}
