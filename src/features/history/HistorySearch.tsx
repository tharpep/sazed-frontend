import styles from "./HistorySearch.module.css";

interface HistorySearchProps {
  value: string;
  onChange: (v: string) => void;
}

export function HistorySearch({ value, onChange }: HistorySearchProps) {
  return (
    <div className={styles.wrapper}>
      <input
        type="text"
        placeholder="Search conversations..."
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
