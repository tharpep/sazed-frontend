import { MOCK_SESSIONS } from "../../mock/data";
import { HistorySearch } from "./HistorySearch";
import { HistoryItem } from "./HistoryItem";
import styles from "./HistoryOverlay.module.css";

interface HistoryOverlayProps {
  open: boolean;
}

const groupedSessions = (() => {
  const groups: Record<string, typeof MOCK_SESSIONS> = {};
  for (const s of MOCK_SESSIONS) {
    if (!groups[s.dateGroup]) groups[s.dateGroup] = [];
    groups[s.dateGroup].push(s);
  }
  return groups;
})();

export function HistoryOverlay({ open }: HistoryOverlayProps) {
  return (
    <div className={`${styles.overlay} ${open ? styles.visible : ""}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>History</h3>
        <button type="button" className={styles.newBtn} title="New conversation">
          +
        </button>
      </div>
      <HistorySearch />
      <div className={styles.list}>
        {Object.entries(groupedSessions).map(([groupName, sessions]) => (
          <div key={groupName}>
            <div className={styles.dateLabel}>{groupName}</div>
            {sessions.map((s) => (
              <HistoryItem
                key={s.id}
                title={s.title}
                time={s.time}
                active={s.id === "1"}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
