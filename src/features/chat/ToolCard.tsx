import type { ToolCall } from "../../mock/data";
import styles from "./ToolCard.module.css";

const CATEGORY_CLASS: Record<ToolCall["category"], string> = {
  calendar: styles.calendar,
  email: styles.email,
  tasks: styles.tasks,
  kb: styles.kb,
  notify: styles.notify,
  memory: styles.memory,
};

interface ToolCardProps {
  category: ToolCall["category"];
  label: string;
  done?: boolean;
}

export function ToolCard({ category, label, done }: ToolCardProps) {
  return (
    <div className={styles.card}>
      <div className={`${styles.icon} ${CATEGORY_CLASS[category]}`}>
        {category === "calendar" && "📅"}
        {category === "kb" && "🔍"}
        {category === "tasks" && "✓"}
        {category === "email" && "✉️"}
        {category === "notify" && "🔔"}
        {category === "memory" && "✓"}
      </div>
      <span className={styles.label}>{label}</span>
      {done && <span className={styles.check}>✓</span>}
    </div>
  );
}
