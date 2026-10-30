import styles from "./HomelabWidget.module.css";

interface HomelabService {
  id: string;
  name: string;
  up?: boolean | null;
  in_maintenance?: boolean | null;
}

interface HomelabWidgetProps {
  summary: { up: number; down: number; unknown: number };
  services: HomelabService[];
}

export function HomelabWidget({ summary, services }: HomelabWidgetProps) {
  const total = summary.up + summary.down + summary.unknown;
  const down = services.filter((s) => s.up === false && !s.in_maintenance);

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" />
          <line x1="7" y1="7.5" x2="7" y2="7.5" /><line x1="7" y1="16.5" x2="7" y2="16.5" />
        </svg>
        <span className={styles.label}>Homelab</span>
      </div>
      <span className={styles.stat}>{summary.up} of {total} up</span>
      {down.length > 0 && (
        <div className={styles.list}>
          {down.slice(0, 3).map((s) => (
            <span key={s.id} className={styles.down}>{s.name}</span>
          ))}
          {down.length > 3 && <span className={styles.more}>+{down.length - 3} more</span>}
        </div>
      )}
    </div>
  );
}
