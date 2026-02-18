import styles from "./StatusDot.module.css";

interface StatusDotProps {
  online?: boolean;
}

export function StatusDot({ online = true }: StatusDotProps) {
  return (
    <div
      className={`${styles.dot} ${online ? "" : styles.offline}`}
      title={online ? "Connected" : "Offline"}
    />
  );
}
