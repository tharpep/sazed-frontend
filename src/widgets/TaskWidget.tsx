import { useEffect, useState } from "react";
import type { Task, TasksData } from "../api/display";
import { fetchTasksDueToday } from "../api/display";
import styles from "./TaskWidget.module.css";

interface TaskWidgetProps {
  tasks?: Task[];
  count?: number;
}

function formatDue(due: string): string {
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = d.getTime() - today.getTime();
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  return `in ${Math.ceil(diff / 86_400_000)}d`;
}

export function TaskWidget({ tasks: propTasks, count: propCount }: TaskWidgetProps) {
  const [data, setData] = useState<TasksData | null>(null);
  const [loading, setLoading] = useState(propTasks === undefined);

  useEffect(() => {
    if (propTasks !== undefined) return;
    let cancelled = false;
    const load = () => {
      setLoading(true);
      fetchTasksDueToday()
        .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
        .catch(() => { if (!cancelled) setLoading(false); });
    };
    load();
    const id = setInterval(load, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [propTasks]);

  const tasks = propTasks ?? data?.tasks ?? [];
  const count = propCount ?? data?.count ?? tasks.length;
  const preview = tasks.slice(0, 3);

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
        <span className={styles.label}>Tasks</span>
        {!loading && count > 0 && (
          <span className={styles.badge}>{count}</span>
        )}
      </div>
      {loading ? (
        <span className={styles.dim}>loading…</span>
      ) : tasks.length === 0 ? (
        <span className={styles.dim}>nothing due</span>
      ) : (
        <div className={styles.list}>
          {preview.map((t) => (
            <div key={t.id} className={styles.task}>
              <span className={styles.taskTitle}>{t.title}</span>
              {t.due && <span className={styles.due}>{formatDue(t.due)}</span>}
            </div>
          ))}
          {count > 3 && (
            <span className={styles.more}>+{count - 3} more</span>
          )}
        </div>
      )}
    </div>
  );
}
