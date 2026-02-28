import { useEffect, useState } from "react";
import type { CalendarEvent, CalendarData } from "../api/display";
import { fetchCalendarToday } from "../api/display";
import styles from "./CalendarWidget.module.css";

interface CalendarWidgetProps {
  events?: CalendarEvent[];
}

function formatTime(start: string, allDay: boolean): string {
  if (allDay) return "all day";
  return new Date(start).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getCountdown(start: string): string | null {
  const diff = new Date(start).getTime() - Date.now();
  if (diff < -60_000) return null; // more than a minute past
  if (diff <= 0) return "now";
  if (diff > 2 * 60 * 60 * 1000) return null; // more than 2 hours away
  const mins = Math.round(diff / 60_000);
  return mins < 1 ? "now" : `in ${mins}m`;
}

export function CalendarWidget({ events: propEvents }: CalendarWidgetProps) {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(!propEvents);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (propEvents) return;
    let cancelled = false;
    const load = () => {
      setLoading(true);
      fetchCalendarToday()
        .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
        .catch(() => { if (!cancelled) setLoading(false); });
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [propEvents]);

  // Re-render every minute to keep countdown accurate
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const events = propEvents ?? data?.events ?? [];
  const upcoming = events
    .filter((e) => !e.all_day || new Date(e.end).getTime() >= Date.now())
    .slice(0, 3);

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className={styles.label}>Today</span>
      </div>
      {loading ? (
        <span className={styles.dim}>loading…</span>
      ) : upcoming.length === 0 ? (
        <span className={styles.dim}>no events today</span>
      ) : (
        <div className={styles.list}>
          {upcoming.map((ev, i) => {
            const countdown = i === 0 ? getCountdown(ev.start) : null;
            return (
              <div key={ev.id} className={styles.event}>
                <span className={styles.time}>{formatTime(ev.start, ev.all_day)}</span>
                <span className={styles.title}>{ev.title}</span>
                {countdown && <span className={styles.countdown}>{countdown}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
