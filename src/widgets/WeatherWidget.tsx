import styles from "./WeatherWidget.module.css";

interface WeatherWidgetProps {
  temp?: number;
  condition?: string;
  location?: string;
}

export function WeatherWidget({ temp, condition, location }: WeatherWidgetProps) {
  const hasData = temp !== undefined;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <span className={styles.label}>Weather</span>
      </div>
      {hasData ? (
        <>
          <div className={styles.temp}>{Math.round(temp!)}°</div>
          {condition && <div className={styles.condition}>{condition}</div>}
          {location && <div className={styles.location}>{location}</div>}
        </>
      ) : (
        <>
          <div className={styles.temp}>—°</div>
          <div className={styles.soon}>coming soon</div>
        </>
      )}
    </div>
  );
}
