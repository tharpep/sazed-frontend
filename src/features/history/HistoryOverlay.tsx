import { useState, useEffect } from "react";
import { useSessionStore } from "../../store/sessionStore";
import { useChatStore } from "../../store/chatStore";
import { useUiStore } from "../../store/uiStore";
import { HistorySearch } from "./HistorySearch";
import { HistoryItem } from "./HistoryItem";
import styles from "./HistoryOverlay.module.css";

interface HistoryOverlayProps {
  open: boolean;
}

export function HistoryOverlay({ open }: HistoryOverlayProps) {
  const [query, setQuery] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessionsError = useSessionStore((s) => s.sessionsError);
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const selectSession = useSessionStore((s) => s.selectSession);
  const loadSession = useChatStore((s) => s.loadSession);
  const newSession = useChatStore((s) => s.newSession);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);

  useEffect(() => {
    if (open) {
      setSessionsLoading(true);
      loadSessions().finally(() => setSessionsLoading(false));
    }
  }, [open, loadSessions]);

  const filtered = query.trim()
    ? sessions.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()))
    : sessions;

  const grouped = (() => {
    const groups: Record<string, typeof sessions> = {};
    for (const s of filtered) {
      if (!groups[s.dateGroup]) groups[s.dateGroup] = [];
      groups[s.dateGroup].push(s);
    }
    return groups;
  })();

  function handleNewChat() {
    newSession();
    setHistoryOpen(false);
  }

  function handleSelectSession(id: string) {
    selectSession(id);
    loadSession(id);
  }

  return (
    <>
    {/* Mobile backdrop — tap anywhere outside the panel to close */}
    {open && (
      <div className={styles.backdrop} onClick={() => setHistoryOpen(false)} />
    )}
    <div className={`${styles.overlay} ${open ? styles.visible : ""}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>History</h3>
        <button
          type="button"
          className={styles.newBtn}
          title="New conversation"
          onClick={handleNewChat}
        >
          +
        </button>
      </div>
      <HistorySearch value={query} onChange={setQuery} />
      {sessionsError && (
        <div className={styles.error}>{sessionsError}</div>
      )}
      <div className={styles.list}>
        {sessionsLoading && sessions.length === 0 && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.skelItem}>
            <div className={styles.skelTitle} style={{ width: `${50 + (i * 19) % 35}%` }} />
            <div className={styles.skelTime} />
          </div>
        ))}
        {Object.entries(grouped).map(([groupName, groupSessions]) => (
          <div key={groupName}>
            <div className={styles.dateLabel}>{groupName}</div>
            {groupSessions.map((s) => (
              <HistoryItem
                key={s.id}
                title={s.title}
                time={s.time}
                active={s.id === activeSessionId}
                onClick={() => handleSelectSession(s.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
