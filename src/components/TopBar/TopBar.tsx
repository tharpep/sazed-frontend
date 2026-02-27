import { StatusDot } from "./StatusDot";
import { IconButton } from "./IconButton";
import { TrafficLights } from "./TrafficLights";
import { isTauri } from "../../lib/isTauri";
import styles from "./TopBar.module.css";

interface TopBarProps {
  historyOpen: boolean;
  kbOpen: boolean;
  settingsOpen: boolean;
  auditOpen: boolean;
  onToggleHistory: () => void;
  onToggleKb: () => void;
  onToggleSettings: () => void;
  onToggleAudit: () => void;
  online?: boolean;
}

export function TopBar({
  historyOpen,
  kbOpen,
  settingsOpen,
  auditOpen,
  onToggleHistory,
  onToggleKb,
  onToggleSettings,
  onToggleAudit,
  online = false,
}: TopBarProps) {
  return (
    <div className={styles.topbar}>
      {isTauri && <TrafficLights />}
      <div className={styles.title}>
        <span className={styles.titleStrong}>sazed</span>
      </div>
      <div className={styles.actions}>
        <div className={styles.historyBtnWrapper}>
          <IconButton
            active={historyOpen}
            title="Conversations"
            onClick={onToggleHistory}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </IconButton>
        </div>
        <IconButton active={kbOpen} title="Knowledge Base & Memory" onClick={onToggleKb}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </IconButton>
        <IconButton active={auditOpen} title="Tool Log" onClick={onToggleAudit}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </IconButton>
        <IconButton active={settingsOpen} title="Settings" onClick={onToggleSettings}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </IconButton>
        <StatusDot online={online} />
      </div>
    </div>
  );
}
