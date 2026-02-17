import type { Message as MessageType } from "../../mock/data";
import { ToolsRow } from "./ToolsRow";
import { EventLine } from "./EventLine";
import styles from "./Message.module.css";

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={styles.msg}>
      <div className={`${styles.label} ${isUser ? styles.you : styles.agent}`}>
        {isUser ? "you" : "sazed"}
      </div>
      {message.role === "assistant" && message.tools && message.tools.length > 0 && (
        <ToolsRow tools={message.tools} />
      )}
      <div className={styles.body}>
        {message.events && message.events.length > 0 ? (
          <>
            <p>Your day:</p>
            <div className={styles.eventsBlock}>
              {message.events.map((ev, i) => (
                <EventLine
                  key={i}
                  time={ev.time}
                  name={ev.name}
                  meta={ev.meta}
                />
              ))}
            </div>
            <p>{message.content}</p>
          </>
        ) : (
          <p>{message.content}</p>
        )}
      </div>
    </div>
  );
}
