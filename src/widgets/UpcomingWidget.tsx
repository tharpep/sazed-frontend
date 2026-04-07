import { useEffect, useState } from "react";
import type { CalendarEvent, CalendarData } from "../api/display";
import { fetchUpcomingCalendar } from "../api/display";
import styles from "./UpcomingWidget.module.css";

interface UpcomingWidgetProps {
  events?: CalendarEvent[];
}

function formatDate(start: string, allDay: boolean): string {
  const d = new Date(start);
  const now = Date.now();
  const diffDays = Math.ceil((d.getTime() - now) / 86_400_000);
  if (diffDays <= 6) {
    const day = d.toLocaleDateString("en-US", { weekday: "short" });
    if (allDay) return day;
    const t = d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
    return `${day} ${t.replace(":00", "").replace(" ", "").toLowerCase()}`;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function augmentTitle(title: string, start: string, allDay: boolean): string {
  const diffDays = Math.ceil((new Date(start).getTime() - Date.now()) / 86_400_000);
  if (diffDays > 14 && allDay) return `${title} — ${diffDays} days`;
  return title;
}

export function UpcomingWidget({ events: propEvents }: UpcomingWidgetProps) {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(!propEvents);

  useEffect(() => {
    if (propEvents) return;
    let cancelled = false;
    const load = () => {
      setLoading(true);
      fetchUpcomingCalendar()
        .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
        .catch(() => { if (!cancelled) setLoading(false); });
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [propEvents]);

  const allEvents = propEvents ?? data?.events ?? [];

  // Only show events starting tomorrow or later
  const startOfTomorrow = new Date();
  startOfTomorrow.setHours(0, 0, 0, 0);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const upcoming = allEvents
    .filter((e) => new Date(e.start) >= startOfTomorrow)
    .slice(0, 3);

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <span className={styles.label}>Upcoming</span>
      </div>
      {loading ? (
        <span className={styles.dim}>loading…</span>
      ) : upcoming.length === 0 ? (
        <span className={styles.dim}>nothing soon</span>
      ) : (
        <div className={styles.list}>
          {upcoming.map((ev) => (
            <div key={ev.id} className={styles.event}>
              <span className={styles.title}>
                {augmentTitle(ev.title, ev.start, ev.all_day)}
              </span>
              <span className={styles.date}>
                {formatDate(ev.start, ev.all_day)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
