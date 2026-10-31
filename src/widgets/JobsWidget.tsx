import { jobStatusClass, jobStatusLabel } from "./jobStatus";
import styles from "./StatusCard.module.css";

interface JobRow {
  job_id: string;
  status: string;
  title?: string | null;
}

export function JobsWidget({ jobs }: { jobs: JobRow[] }) {
  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.label}>Jobs</span>
      </div>
      {jobs.length === 0 ? (
        <span className={styles.meta}>no recent jobs</span>
      ) : (
        <div className={styles.list}>
          {jobs.slice(0, 5).map((job) => (
            <div key={job.job_id} className={styles.row}>
              <span className={styles.rowTitle}>{job.title ?? "Untitled job"}</span>
              <span className={`${styles.rowMeta} ${jobStatusClass(job.status)}`}>
                {jobStatusLabel(job.status)}
              </span>
            </div>
          ))}
          {jobs.length > 5 && <span className={styles.more}>+{jobs.length - 5} more</span>}
        </div>
      )}
    </div>
  );
}
