import styles from "./TaskLine.module.css";

interface TaskLineProps {
  text: string;
}

export function TaskLine({ text }: TaskLineProps) {
  return (
    <div className={styles.line}>
      <span className={styles.arrow}>→</span>
      <span className={styles.text}>{text}</span>
    </div>
  );
}
