import styles from "./TrafficLights.module.css";

export function TrafficLights() {
  return (
    <div className={styles.lights}>
      <div className={`${styles.dot} ${styles.red}`} />
      <div className={`${styles.dot} ${styles.yellow}`} />
      <div className={`${styles.dot} ${styles.green}`} />
    </div>
  );
}
