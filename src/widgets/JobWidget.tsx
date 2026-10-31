import { jobStatusClass, jobStatusLabel } from "./jobStatus";
import styles from "./StatusCard.module.css";

interface JobWidgetProps {
  status: string;
  kind: string;
  title?: string | null;
  pr_url?: string | null;
  ci_state?: string | null;
  question?: string | null;
  error?: string | null;
}

export function JobWidget({ status, kind, title, pr_url, ci_state, question, error }: JobWidgetProps) {
  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.label}>{kind.replace(/_/g, " ")}</span>
        <span className={`${styles.status} ${jobStatusClass(status)}`}>
          {jobStatusLabel(status)}
        </span>
      </div>
      <span className={styles.title}>{title ?? "Untitled job"}</span>
      {question && <span className={`${styles.meta} ${styles.attention}`}>{question}</span>}
      {error && <span className={`${styles.meta} ${styles.problem}`}>{error}</span>}
      {pr_url && (
        <span className={styles.meta}>
          <a className={styles.link} href={pr_url} target="_blank" rel="noreferrer">
            Pull request
          </a>
          {ci_state && ` · CI ${ci_state}`}
        </span>
      )}
    </div>
  );
}
