import type { ToolBlock } from "../../mock/data";
import styles from "./ToolCard.module.css";

const CATEGORY_CLASS: Record<ToolBlock["category"], string> = {
  calendar: styles.calendar,
  email: styles.email,
  tasks: styles.tasks,
  kb: styles.kb,
  notify: styles.notify,
  memory: styles.memory,
  finance: styles.finance,
};

type ToolCardProps = Omit<ToolBlock, "type">;

export function ToolCard({ category, label, status, error }: ToolCardProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={`${styles.icon} ${CATEGORY_CLASS[category]}`}>
          {category === "calendar" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          )}
          {category === "email" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          )}
          {category === "tasks" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          )}
          {category === "kb" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          )}
          {category === "notify" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          )}
          {category === "memory" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          )}
          {category === "finance" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <path d="M15 10a3 3 0 10-6 0c0 1.66 3 2.5 3 4a1.5 1.5 0 11-3 0" />
            </svg>
          )}
        </div>
        <span className={styles.label}>{label}</span>
        {status === "pending" && (
          <span className={styles.spinner}>
            <span /><span /><span />
          </span>
        )}
        {status === "success" && <span className={styles.check}>✓</span>}
        {status === "error" && <span className={styles.errorBadge}>✗</span>}
      </div>
      {status === "error" && error && (
        <p className={styles.errorMsg}>{error}</p>
      )}
    </div>
  );
}
