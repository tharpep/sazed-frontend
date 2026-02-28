import { useEffect, useState } from "react";
import type { EmailMessage, EmailData } from "../api/display";
import { fetchUnreadEmail } from "../api/display";
import styles from "./EmailBadge.module.css";

interface EmailBadgeProps {
  count?: number;
  messages?: EmailMessage[];
}

export function EmailBadge({ count: propCount, messages: propMessages }: EmailBadgeProps) {
  const [data, setData] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(propCount === undefined);

  useEffect(() => {
    if (propCount !== undefined) return;
    let cancelled = false;
    const load = () => {
      setLoading(true);
      fetchUnreadEmail()
        .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
        .catch(() => { if (!cancelled) setLoading(false); });
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [propCount]);

  const count = propCount ?? data?.count ?? 0;
  const messages = propMessages ?? data?.messages ?? [];
  const preview = messages.slice(0, 2);

  function senderName(sender: string): string {
    return sender.replace(/<[^>]+>/, "").trim() || sender;
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <span className={styles.label}>Mail</span>
      </div>
      {loading ? (
        <span className={styles.dim}>loading…</span>
      ) : (
        <>
          <div className={styles.countRow}>
            <span className={styles.count}>{count}</span>
            <span className={styles.countLabel}>unread</span>
          </div>
          {preview.length > 0 && (
            <div className={styles.snippets}>
              {preview.map((m) => (
                <div key={m.id} className={styles.snippet}>
                  <span className={styles.sender}>{senderName(m.sender)}</span>
                  <span className={styles.subject}>{m.subject}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
