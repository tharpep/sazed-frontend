import { useEffect, useState } from "react";
import { getActionLogs } from "../../api/audit";
import type { ActionLog } from "../../api/audit";
import styles from "./AuditPage.module.css";

const TRUNCATE = 400;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function truncate(s: string | null): string {
  if (!s) return "—";
  return s.length > TRUNCATE ? s.slice(0, TRUNCATE) + "…" : s;
}

function Row({ log }: { log: ActionLog }) {
  const [expanded, setExpanded] = useState(false);
  const inputStr = log.input ? JSON.stringify(log.input, null, 2) : null;

  return (
    <>
      <tr className={styles.row} onClick={() => setExpanded((v) => !v)}>
        <td>
          <span className={log.status === "success" ? styles.dotSuccess : styles.dotError} />
        </td>
        <td className={styles.toolName}>{log.tool_name}</td>
        <td className={styles.duration}>{log.duration_ms != null ? `${log.duration_ms}ms` : "—"}</td>
        <td className={styles.time}>{formatTime(log.timestamp)}</td>
        <td className={styles.expand}>{expanded ? "−" : "+"}</td>
      </tr>
      {expanded && (
        <tr className={styles.expandRow}>
          <td colSpan={5}>
            <div className={styles.detail}>
              {log.error_message && (
                <p className={styles.errorMsg}>{log.error_message}</p>
              )}
              <div className={styles.ioGrid}>
                <div>
                  <p className={styles.ioLabel}>input</p>
                  <pre className={styles.pre}>{truncate(inputStr)}</pre>
                </div>
                <div>
                  <p className={styles.ioLabel}>output</p>
                  <pre className={styles.pre}>{truncate(log.output)}</pre>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function AuditPage() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getActionLogs()
      .then(setLogs)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.heading}>tool log</div>
      {loading && <p className={styles.state}>Loading…</p>}
      {error && <p className={styles.stateError}>{error}</p>}
      {!loading && !error && logs.length === 0 && (
        <p className={styles.state}>No tool calls recorded yet.</p>
      )}
      {!loading && !error && logs.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th />
              <th>tool</th>
              <th>duration</th>
              <th>time</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <Row key={log.id} log={log} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
