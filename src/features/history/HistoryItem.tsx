import styles from "./HistoryItem.module.css";

interface HistoryItemProps {
  title: string;
  time: string;
  active?: boolean;
}

export function HistoryItem({ title, time, active }: HistoryItemProps) {
  return (
    <div className={`${styles.item} ${active ? styles.active : ""}`}>
      <div className={styles.title}>{title}</div>
      <div className={styles.time}>{time}</div>
    </div>
  );
}
