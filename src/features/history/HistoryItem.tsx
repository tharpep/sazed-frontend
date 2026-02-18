import styles from "./HistoryItem.module.css";

interface HistoryItemProps {
  title: string;
  time: string;
  active?: boolean;
  onClick?: () => void;
}

export function HistoryItem({ title, time, active, onClick }: HistoryItemProps) {
  return (
    <div
      className={`${styles.item} ${active ? styles.active : ""}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.title}>{title}</div>
      <div className={styles.time}>{time}</div>
    </div>
  );
}
