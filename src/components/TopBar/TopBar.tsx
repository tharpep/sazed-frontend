import { StatusDot } from "./StatusDot";
import { IconButton } from "./IconButton";
import styles from "./TopBar.module.css";

interface TopBarProps {
  historyOpen: boolean;
  onToggleHistory: () => void;
}

export function TopBar({ historyOpen, onToggleHistory }: TopBarProps) {
  return (
    <div className={styles.topbar}>
      <div className={styles.title}>
        <span className={styles.titleStrong}>sazed</span> · session #247
      </div>
      <div className={styles.actions}>
        <IconButton
          active={historyOpen}
          title="Conversations"
          onClick={onToggleHistory}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </IconButton>
        <IconButton title="Knowledge Base">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </IconButton>
        <StatusDot />
      </div>
    </div>
  );
}
