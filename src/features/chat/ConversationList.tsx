import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useHubScroll } from "@/hooks/useHubScroll";
import { useSessionStore, type ChatSession } from "@/store/sessionStore";

export type SessionGroup = [label: string, sessions: ChatSession[]];

/** Sessions whose title holds the query, grouped by day heading in list order. */
export function groupSessions(sessions: ChatSession[], query: string): SessionGroup[] {
  const filtered = query.trim()
    ? sessions.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()))
    : sessions;
  const grouped = filtered.reduce<Record<string, ChatSession[]>>((acc, s) => {
    (acc[s.dateGroup] ??= []).push(s);
    return acc;
  }, {});
  return Object.entries(grouped);
}

/** The conversation history: loaded each time `open` turns true, filtered by `query`. */
export function useConversationList(open: boolean, query: string) {
  const sessions = useSessionStore((s) => s.sessions);
  const error = useSessionStore((s) => s.sessionsError);
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadSessions().finally(() => setLoading(false));
  }, [open, loadSessions]);

  return { groups: groupSessions(sessions, query), skeleton: loading && sessions.length === 0, error };
}

export type ConversationListData = ReturnType<typeof useConversationList>;

// One-line rows as in phone.html option D.
const STYLE = {
  search: "px-3 pt-2 pb-1 sm:px-2",
  // 16px on phones, or iOS zooms the page when the field takes focus.
  input: "h-11 bg-surface text-[16px] sm:h-[30px] sm:text-meta",
  error: "px-3 pb-2 text-caption",
  group: "px-2 pt-2 pb-0.5 text-caption text-muted",
  row: "flex min-h-12 w-full items-center gap-2 rounded-[7px] px-2 text-left text-body text-ink-2 transition-colors hover:bg-surface sm:min-h-0 sm:py-1.5 sm:text-meta",
  active: "bg-raised text-ink hover:bg-raised",
  title: "min-w-0 flex-1 truncate",
  time: "flex-none text-caption text-muted tabular-nums",
};
const SKELETON_ROWS = 8;

interface ConversationListProps {
  data: ConversationListData;
  query: string;
  onQuery: (query: string) => void;
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Search, then the conversations grouped by day. */
export function ConversationList({ data, query, onQuery, activeId, onSelect }: ConversationListProps) {
  const body = data.skeleton ? (
    <div className="space-y-2 px-1 py-1">
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-surface sm:h-8" />
      ))}
    </div>
  ) : (
    data.groups.map(([groupName, groupSessions]) => (
      <div key={groupName} className="mb-2">
        <div className={STYLE.group}>{groupName}</div>
        {groupSessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-current={s.id === activeId ? "true" : undefined}
            className={cn(STYLE.row, s.id === activeId && STYLE.active)}
          >
            <span className={STYLE.title}>{s.title}</span>
            <span className={STYLE.time}>{s.shortTime}</span>
          </button>
        ))}
      </div>
    ))
  );

  return (
    <>
      <div className={STYLE.search}>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search conversations…"
          aria-label="Search conversations"
          className={cn(
            "w-full rounded-md border border-border px-2.5 text-sm text-ink placeholder:text-muted outline-none focus-visible:border-primary",
            STYLE.input
          )}
        />
      </div>
      {data.error && <p className={cn(STYLE.error, "text-destructive")}>{data.error}</p>}
      <HubScroller>{body}</HubScroller>
    </>
  );
}

/** The hub list keeps its scroll under chat:list, so Back from a conversation lands where it was. */
function HubScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useHubScroll(ref, "chat:list");
  return (
    <div ref={ref} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">{children}</div>
    </div>
  );
}
