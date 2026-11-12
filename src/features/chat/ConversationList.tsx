import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// panel and drill are the old shell's desktop panel and phone screen, kept as they were; hub is
// the hub shell's Chats list, one-line rows as in phone.html option D.
type Variant = "panel" | "drill" | "hub";

const STYLE: Record<
  Variant,
  { search: string; input: string; error: string; skeleton: [number, string]; group: string; row: string; active: string; title: string; time: string }
> = {
  panel: {
    search: "px-3 pb-2",
    input: "bg-bg py-1.5",
    error: "px-3 pb-2 text-xs",
    skeleton: [6, "h-9"],
    group: "px-1.5 py-1 text-xs font-medium tracking-wide text-muted",
    row: "flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg",
    active: "bg-bg",
    title: "w-full truncate text-sm text-ink",
    time: "text-xs text-muted",
  },
  drill: {
    search: "px-3 py-2",
    input: "bg-surface py-2",
    error: "px-3 pb-2 text-xs",
    skeleton: [8, "h-12"],
    group: "px-1.5 py-1 text-xs font-medium tracking-wide text-muted",
    row: "flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2.5 text-left transition-colors hover:bg-surface",
    active: "bg-surface",
    title: "w-full truncate text-sm text-ink",
    time: "text-xs text-muted",
  },
  hub: {
    search: "px-3 pt-2 pb-1 sm:px-2",
    // 16px on phones, or iOS zooms the page when the field takes focus.
    input: "h-11 bg-surface text-[16px] sm:h-[30px] sm:text-meta",
    error: "px-3 pb-2 text-caption",
    skeleton: [8, "h-12 sm:h-8"],
    group: "px-2 pt-2 pb-0.5 text-caption text-muted",
    row: "flex min-h-12 w-full items-center gap-2 rounded-[7px] px-2 text-left text-body text-ink-2 transition-colors hover:bg-surface sm:min-h-0 sm:py-1.5 sm:text-meta",
    active: "bg-raised text-ink hover:bg-raised",
    title: "min-w-0 flex-1 truncate",
    time: "flex-none text-caption text-muted tabular-nums",
  },
};

interface ConversationListProps {
  variant: Variant;
  data: ConversationListData;
  query: string;
  onQuery: (query: string) => void;
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Search, then the conversations grouped by day. */
export function ConversationList({ variant, data, query, onQuery, activeId, onSelect }: ConversationListProps) {
  const style = STYLE[variant];
  const [count, height] = style.skeleton;

  const body = data.skeleton ? (
    <div className="space-y-2 px-1 py-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn(height, "animate-pulse rounded-md bg-surface")} />
      ))}
    </div>
  ) : (
    data.groups.map(([groupName, groupSessions]) => (
      <div key={groupName} className="mb-2">
        <div className={style.group}>{groupName}</div>
        {groupSessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-current={variant === "hub" && s.id === activeId ? "true" : undefined}
            className={cn(style.row, s.id === activeId && style.active)}
          >
            <span className={style.title}>{s.title}</span>
            <span className={style.time}>{variant === "hub" ? s.shortTime : s.time}</span>
          </button>
        ))}
      </div>
    ))
  );

  return (
    <>
      <div className={style.search}>
        <input
          type={variant === "hub" ? "search" : "text"}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search conversations…"
          aria-label={variant === "hub" ? "Search conversations" : undefined}
          className={cn(
            "w-full rounded-md border border-border px-2.5 text-sm text-ink placeholder:text-muted outline-none focus-visible:border-primary",
            style.input
          )}
        />
      </div>
      {data.error && <p className={cn(style.error, "text-destructive")}>{data.error}</p>}
      {variant === "hub" ? (
        <HubScroller>{body}</HubScroller>
      ) : (
        <ScrollArea className={variant === "panel" ? "flex-1 px-2" : "min-h-0 flex-1 px-2"}>{body}</ScrollArea>
      )}
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

interface ConversationDrillDownProps extends Omit<ConversationListProps, "variant"> {
  open: boolean;
  onBack: () => void;
  onNewChat: () => void;
}

/** The old shell's phone history: a full screen over the page, the same list-then-editor pattern
 * JournalPage uses, rather than sharing width with the transcript. */
export function ConversationDrillDown({ open, onBack, onNewChat, onSelect, ...list }: ConversationDrillDownProps) {
  return (
    <div
      className={cn(
        // Fixed to the viewport, so it skips AppShell's safe-area padding and needs its own
        // (status bar / Dynamic Island on top, home indicator below).
        "fixed inset-0 z-40 flex-col bg-bg pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] sm:hidden",
        open ? "flex" : "hidden"
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <h2 className="flex-1 text-sm font-medium text-ink">Conversations</h2>
        <button
          type="button"
          onClick={onNewChat}
          aria-label="New chat"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <MessageSquarePlus className="size-4" aria-hidden="true" />
        </button>
      </div>
      <ConversationList
        variant="drill"
        {...list}
        onSelect={(id) => {
          onSelect(id);
          onBack();
        }}
      />
    </div>
  );
}
