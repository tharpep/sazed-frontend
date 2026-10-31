import styles from "./StatusCard.module.css";

const LABELS: Record<string, string> = {
  needs_approval: "Waiting on approval",
  needs_input: "Waiting on an answer",
  queued: "Queued",
  running: "Running",
  paused: "Paused",
  succeeded: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function jobStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}

/** Quiet unless something needs Pryce: waiting is gold, failed is the one red. */
export function jobStatusClass(status: string): string {
  if (status === "failed") return styles.problem;
  if (status === "needs_approval" || status === "needs_input" || status === "paused") {
    return styles.attention;
  }
  return "";
}
