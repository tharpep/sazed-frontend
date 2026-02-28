import { useEffect, useState } from "react";
import type { UpcomingPayment } from "../api/display";
import { fetchUpcomingPayments } from "../api/display";
import styles from "./FinanceWidget.module.css";

interface FinanceWidgetProps {
  upcoming?: UpcomingPayment[];
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = d.getTime() - today.getTime();
  if (diff <= 0) return "today";
  if (diff <= 86_400_000) return "tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function FinanceWidget({ upcoming: propUpcoming }: FinanceWidgetProps) {
  const [data, setData] = useState<UpcomingPayment[] | null>(null);
  const [loading, setLoading] = useState(propUpcoming === undefined);

  useEffect(() => {
    if (propUpcoming !== undefined) return;
    let cancelled = false;
    const load = () => {
      setLoading(true);
      fetchUpcomingPayments(7)
        .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
        .catch(() => { if (!cancelled) setLoading(false); });
    };
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [propUpcoming]);

  const upcoming = propUpcoming ?? data ?? [];
  const preview = upcoming.slice(0, 2);

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <path d="M15 10a3 3 0 10-6 0c0 1.66 3 2.5 3 4a1.5 1.5 0 11-3 0" />
        </svg>
        <span className={styles.label}>Upcoming</span>
      </div>
      {loading ? (
        <span className={styles.dim}>loading…</span>
      ) : preview.length === 0 ? (
        <span className={styles.dim}>nothing due this week</span>
      ) : (
        <div className={styles.list}>
          {preview.map((p, i) => (
            <div key={i} className={styles.payment}>
              <span className={styles.name}>{p.name}</span>
              <div className={styles.meta}>
                <span className={styles.amount}>{formatAmount(p.amount)}</span>
                <span className={styles.date}>{formatDate(p.next_billing_date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
