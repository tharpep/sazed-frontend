import { MOCK_MESSAGES } from "../../mock/data";
import { Message } from "./Message";
import styles from "./ChatArea.module.css";

export function ChatArea() {
  return (
    <div className={styles.area}>
      <div className={styles.content}>
        {MOCK_MESSAGES.map((msg, i) => (
          <Message key={i} message={msg} />
        ))}
      </div>
    </div>
  );
}
