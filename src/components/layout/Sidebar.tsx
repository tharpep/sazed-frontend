import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Library,
  MessageSquarePlus,
  History as HistoryIcon,
  ScrollText,
  Settings as SettingsIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useUiStore } from "@/store/uiStore";
import { useSessionStore } from "@/store/sessionStore";
import { useChatStore } from "@/store/chatStore";

interface RailButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function RailButton({ label, active, onClick, children }: RailButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            aria-pressed={active}
            onClick={onClick}
            className={cn(
              "text-muted hover:text-ink hover:bg-surface",
              active && "bg-surface text-primary"
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const historyOpen = useUiStore((s) => s.historyOpen);
  const journalOpen = useUiStore((s) => s.journalOpen);
  const kbOpen = useUiStore((s) => s.kbOpen);
  const auditOpen = useUiStore((s) => s.auditOpen);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const toggleHistory = useUiStore((s) => s.toggleHistory);
  const toggleJournal = useUiStore((s) => s.toggleJournal);
  const toggleKb = useUiStore((s) => s.toggleKb);
  const toggleAudit = useUiStore((s) => s.toggleAudit);
  const toggleSettings = useUiStore((s) => s.toggleSettings);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);

  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessionsError = useSessionStore((s) => s.sessionsError);
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const selectSession = useSessionStore((s) => s.selectSession);
  const loadSession = useChatStore((s) => s.loadSession);
  const newSession = useChatStore((s) => s.newSession);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!historyOpen) return;
    setLoading(true);
    loadSessions().finally(() => setLoading(false));
  }, [historyOpen, loadSessions]);

  const filtered = query.trim()
    ? sessions.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()))
    : sessions;

  const grouped = filtered.reduce<Record<string, typeof sessions>>((acc, s) => {
    (acc[s.dateGroup] ??= []).push(s);
    return acc;
  }, {});

  function handleNewChat() {
    newSession();
    setHistoryOpen(false);
  }

  function handleSelectSession(id: string) {
    selectSession(id);
    loadSession(id);
  }

  return (
    <div className="flex h-full">
      <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface/40 py-3">
        <RailButton label="New chat" active={false} onClick={handleNewChat}>
          <MessageSquarePlus className="size-4" aria-hidden="true" />
        </RailButton>
        <RailButton label="Conversations" active={historyOpen} onClick={toggleHistory}>
          <HistoryIcon className="size-4" aria-hidden="true" />
        </RailButton>
        <RailButton label="Journal" active={journalOpen} onClick={toggleJournal}>
          <BookOpen className="size-4" aria-hidden="true" />
        </RailButton>
        <RailButton label="Knowledge base" active={kbOpen} onClick={toggleKb}>
          <Library className="size-4" aria-hidden="true" />
        </RailButton>
        <RailButton label="Tool log" active={auditOpen} onClick={toggleAudit}>
          <ScrollText className="size-4" aria-hidden="true" />
        </RailButton>
        <div className="flex-1" />
        <RailButton label="Settings" active={settingsOpen} onClick={toggleSettings}>
          <SettingsIcon className="size-4" aria-hidden="true" />
        </RailButton>
        <ThemeToggle />
      </nav>

      <AnimatePresence initial={false}>
        {historyOpen && (
          <motion.div
            key="history-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-r border-border bg-surface/40"
          >
            <div className="flex h-full w-[260px] flex-col">
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <h2 className="text-sm font-medium tracking-wide text-ink">Conversations</h2>
              </div>
              <div className="px-3 pb-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search conversations…"
                  className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-ink placeholder:text-muted outline-none focus-visible:border-primary"
                />
              </div>
              {sessionsError && (
                <p className="px-3 pb-2 text-xs text-destructive">{sessionsError}</p>
              )}
              <ScrollArea className="flex-1 px-2">
                {loading && sessions.length === 0 ? (
                  <div className="space-y-2 px-1 py-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-9 animate-pulse rounded-md bg-surface" />
                    ))}
                  </div>
                ) : (
                  Object.entries(grouped).map(([groupName, groupSessions]) => (
                    <div key={groupName} className="mb-2">
                      <div className="px-1.5 py-1 text-xs font-medium tracking-wide text-muted">
                        {groupName}
                      </div>
                      {groupSessions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectSession(s.id)}
                          className={cn(
                            "flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bg",
                            s.id === activeSessionId && "bg-bg"
                          )}
                        >
                          <span className="w-full truncate text-sm text-ink">{s.title}</span>
                          <span className="text-xs text-muted">{s.time}</span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
