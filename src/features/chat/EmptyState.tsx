import { useChatStore } from "../../store/chatStore";
import styles from "./EmptyState.module.css";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning, Pryce";
  if (h < 17) return "Afternoon, Pryce";
  return "Evening, Pryce";
}

const PILLS: { label: string; message: string }[] = [
  { label: "What's on today?",    message: "What's on my calendar and tasks for today?" },
  { label: "Catch me up",         message: "Catch me up on anything I've missed — emails, tasks, updates" },
  { label: "What's due this week?", message: "What do I have due this week?" },
  { label: "How's my day looking?", message: "How's my day looking overall?" },
];

export function EmptyState() {
  const send = useChatStore((s) => s.send);
  return (
    <div className={styles.empty}>
      <div className={styles.greeting}>{getGreeting()}</div>
      <div className={styles.sub}>Ask anything — calendar, tasks, notes, email</div>
      <div className={styles.actions}>
        {PILLS.map(({ label, message }) => (
          <button
            key={label}
            type="button"
            className={styles.pill}
            onClick={() => send(message)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
