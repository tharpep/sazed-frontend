import type { ToolBlock } from "../../mock/data";
import styles from "./ToolCard.module.css";

const CATEGORY_CLASS: Record<ToolBlock["category"], string> = {
  calendar: styles.calendar,
  email: styles.email,
  tasks: styles.tasks,
  kb: styles.kb,
  notify: styles.notify,
  memory: styles.memory,
};

type ToolCardProps = Omit<ToolBlock, "type">;

export function ToolCard({ category, label, status, error }: ToolCardProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={`${styles.icon} ${CATEGORY_CLASS[category]}`}>
          {category === "calendar" && "cal"}
          {category === "kb" && "kb"}
          {category === "tasks" && "do"}
          {category === "email" && "@"}
          {category === "notify" && "!"}
          {category === "memory" && "mem"}
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
