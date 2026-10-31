import styles from "./StatusCard.module.css";

type Tone = "normal" | "attention" | "problem";

interface InfoStat {
  label: string;
  value: string;
  tone?: Tone | null;
}

interface InfoRow {
  label: string;
  value?: string | null;
  tone?: Tone | null;
}

interface InfoCardProps {
  title: string;
  subtitle?: string | null;
  stats?: InfoStat[] | null;
  rows?: InfoRow[] | null;
  note?: string | null;
}

const TONE_CLASS: Record<Tone, string> = {
  normal: "",
  attention: styles.attention,
  problem: styles.problem,
};

/** The general-purpose card: a model fills these fields when no fixed card fits. */
export function InfoCard({ title, subtitle, stats, rows, note }: InfoCardProps) {
  const shownRows = rows?.slice(0, 6) ?? [];
  const hidden = (rows?.length ?? 0) - shownRows.length;

  return (
    <div className={styles.widget}>
      <span className={styles.title}>{title}</span>
      {subtitle && <span className={styles.meta}>{subtitle}</span>}
      {stats && stats.length > 0 && (
        <div className={styles.stats}>
          {stats.slice(0, 4).map((stat) => (
            <div key={stat.label} className={styles.statBlock}>
              <span className={`${styles.statValue} ${TONE_CLASS[stat.tone ?? "normal"]}`}>
                {stat.value}
              </span>
              <span className={styles.more}>{stat.label}</span>
            </div>
          ))}
        </div>
      )}
      {shownRows.length > 0 && (
        <div className={`${styles.list} ${styles.meta}`}>
          {shownRows.map((row) => (
            <div key={row.label} className={styles.row}>
              <span className={`${styles.rowTitle} ${TONE_CLASS[row.tone ?? "normal"]}`}>
                {row.label}
              </span>
              {row.value && <span className={styles.rowMeta}>{row.value}</span>}
            </div>
          ))}
          {hidden > 0 && <span className={styles.more}>+{hidden} more</span>}
        </div>
      )}
      {note && <span className={styles.meta}>{note}</span>}
    </div>
  );
}
