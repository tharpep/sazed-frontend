import styles from "./EmptyState.module.css";

export function EmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.greeting}>Evening, Pryce</div>
      <div className={styles.sub}>2 tasks due tomorrow · inbox clear</div>
      <div className={styles.actions}>
        <button type="button" className={styles.pill}>
          Tomorrow's plan
        </button>
        <button type="button" className={styles.pill}>
          Open tasks
        </button>
        <button type="button" className={styles.pill}>
          Search notes
        </button>
        <button type="button" className={styles.pill}>
          Unread emails
        </button>
      </div>
    </div>
  );
}
