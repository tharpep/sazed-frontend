import type { Session, SessionAgent, SessionDetail } from "@/api/sessions";
import { cn } from "@/lib/utils";
import { sessionLabel } from "@/widgets/projectWork";

import { AgentRows, HostChip, RunGlyph } from "./AgentSteps";
import { heardOf, isWarn, linkWord, sessionTitle, sourceWord, span, statusWord, subagents } from "./sessions";
import { clockOf } from "./shipped";

// Home shows a session's newest few agents; the card sheet and the steps sheet hold the rest.
const AGENTS_ON_HOME = 4;

/** The question a session is blocked on, sitting on its row (mockup H: needs-you on the run). */
function Question({ session, detail }: { session: Session; detail: SessionDetail | undefined }) {
  const q = session.question!;
  const asker = q.agent_id ? detail?.agents.find((a) => a.agent_id === q.agent_id) : null;
  return (
    <div className="col-span-2 col-start-2 mt-1.5 rounded-[10px] border border-warn/70 px-3 py-2.5">
      <p className="text-meta font-medium text-warn">Needs you</p>
      <p className="text-meta [overflow-wrap:anywhere] text-ink">{q.text || "A question is waiting in the terminal."}</p>
      <p className="mt-0.5 text-caption text-muted">
        {asker ? `${asker.agent_type ?? "Agent"}, ` : q.agent_id ? "a subagent, " : ""}asked {clockOf(q.asked_at)}. Answer it in
        Claude Code.
      </p>
    </div>
  );
}

interface Props {
  session: Session;
  detail: SessionDetail | undefined;
  onOpen: () => void;
  onOpenAgent: (agent: SessionAgent) => void;
}

/** A live Claude Code session in Running: its card, doing line, host and last heard. */
export function SessionRow({ session, detail, onOpen, onOpenAgent }: Props) {
  const warn = isWarn(session.status);
  const word = statusWord(session.status);
  const heard = heardOf(session.last_heard_at, session.status);
  const source = sourceWord(session.doing_source);
  const agents = subagents(detail?.agents).slice(-AGENTS_ON_HOME);
  return (
    <li
      onClick={onOpen}
      className="grid min-h-12 cursor-pointer grid-cols-[22px_minmax(0,1fr)_auto] gap-x-2.5 gap-y-0.5 px-1 py-2 sm:rounded-lg sm:px-3 sm:hover:bg-surface"
    >
      <span className="flex h-5 items-center justify-center">
        <RunGlyph state={session.status} warn={warn} />
      </span>
      <span className="min-w-0">
        <span className={cn("block text-body font-medium [overflow-wrap:anywhere] text-ink", !session.card && "font-mono text-[13px]")}>
          {sessionTitle(session)}
        </span>
        {session.doing && (
          <span className="line-clamp-2 text-meta [overflow-wrap:anywhere] text-ink-2" title={session.doing}>
            {session.doing}
            {source && <span className="text-muted"> · {source}</span>}
          </span>
        )}
      </span>
      <span className="flex flex-col items-end">
        <span className={cn("font-mono text-meta whitespace-nowrap tabular-nums", warn ? "text-warn" : "text-muted")}>
          {word ?? span(session.started_at)}
        </span>
        <span className={cn("text-caption whitespace-nowrap", heard.warn ? "text-warn" : "text-muted")}>{heard.text}</span>
      </span>
      <p className="col-span-2 col-start-2 text-caption [overflow-wrap:anywhere] text-muted">
        <span className={cn(!session.card && "text-ink-2")}>{linkWord(session)}</span>
        {" · "}Claude Code session {sessionLabel(session.session_id)}
        {session.host && (
          <>
            {" · "}
            <HostChip host={session.host} />
          </>
        )}
        {" · "}started {clockOf(session.started_at)}
      </p>
      {session.question && <Question session={session} detail={detail} />}
      <AgentRows agents={agents} onOpen={onOpenAgent} className="col-span-2 col-start-2 mt-1" />
    </li>
  );
}
