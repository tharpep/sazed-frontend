import type { Message as MessageType } from "../../mock/data";
import { ToolsRow } from "./ToolsRow";
import { EventLine } from "./EventLine";
import { StreamingIndicator } from "./StreamingIndicator";
import { MarkdownContent } from "./MarkdownContent";
import styles from "./Message.module.css";

interface MessageProps {
  message: MessageType;
  isLastStreaming?: boolean;
}

export function Message({ message, isLastStreaming = false }: MessageProps) {
  const isUser = message.role === "user";
  const hasTools = message.role === "assistant" && message.tools && message.tools.length > 0;
  const showDots = isLastStreaming && !message.content && !hasTools;

  return (
    <div className={styles.msg}>
      <div className={`${styles.label} ${isUser ? styles.you : styles.agent}`}>
        {isUser ? "you" : "sazed"}
      </div>
      {hasTools && <ToolsRow tools={message.tools!} />}
      <div className={`${styles.body}${hasTools && message.content ? ` ${styles.bodyAfterTools}` : ""}`}>
        {showDots ? (
          <StreamingIndicator />
        ) : message.events && message.events.length > 0 ? (
          <>
            <p>Your day:</p>
            <div className={styles.eventsBlock}>
              {message.events.map((ev, i) => (
                <EventLine key={i} time={ev.time} name={ev.name} meta={ev.meta} />
              ))}
            </div>
            {message.content && (
              isUser
                ? <p>{message.content}</p>
                : <MarkdownContent content={message.content} />
            )}
          </>
        ) : isUser ? (
          <p>{message.content}</p>
        ) : (
          <MarkdownContent content={message.content} />
        )}
      </div>
    </div>
  );
}
