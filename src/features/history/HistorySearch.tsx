import styles from "./HistorySearch.module.css";

export function HistorySearch() {
  return (
    <div className={styles.wrapper}>
      <input
        type="text"
        placeholder="Search conversations..."
        className={styles.input}
      />
    </div>
  );
}
