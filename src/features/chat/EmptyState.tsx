import { useChatStore } from "../../store/chatStore";
import styles from "./EmptyState.module.css";

export function EmptyState() {
  const send = useChatStore((s) => s.send);
  return (
    <div className={styles.empty}>
      <div className={styles.greeting}>Evening, Pryce</div>
      <div className={styles.sub}>Ask anything — calendar, tasks, notes, email</div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.pill}
          onClick={() => send("What's on my calendar for tomorrow?")}
        >
          Tomorrow's plan
        </button>
        <button
          type="button"
          className={styles.pill}
          onClick={() => send("What are my open tasks?")}
        >
          Open tasks
        </button>
        <button
          type="button"
          className={styles.pill}
          onClick={() => send("Search my notes")}
        >
          Search notes
        </button>
        <button
          type="button"
          className={styles.pill}
          onClick={() => send("Show my unread emails")}
        >
          Unread emails
        </button>
      </div>
    </div>
  );
}
