import styles from "./StreamingIndicator.module.css";

export function StreamingIndicator() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.dot} />
      <div className={styles.dot} />
      <div className={styles.dot} />
    </div>
  );
}
