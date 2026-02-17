import styles from "./EventLine.module.css";

interface EventLineProps {
  time: string;
  name: string;
  meta?: string;
}

export function EventLine({ time, name, meta }: EventLineProps) {
  return (
    <div className={styles.line}>
      <span className={styles.time}>{time}</span>
      <span className={styles.name}>{name}</span>
      {meta && <span className={styles.meta}>{meta}</span>}
    </div>
  );
}
