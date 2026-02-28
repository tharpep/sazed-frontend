import type { Message as MessageType } from "../../mock/data";
import { ToolCard } from "./ToolCard";
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
  const hasBlocks = !isUser && message.blocks && message.blocks.length > 0;
  const showDots = isLastStreaming && !isUser && !hasBlocks && !message.content;

  return (
    <div className={`${styles.msg} ${!isUser ? styles.agentMsg : styles.userMsg}`}>
      <div className={`${styles.label} ${isUser ? styles.you : styles.agent}`}>
        {isUser ? "you" : "sazed"}
      </div>

      {hasBlocks ? (
        message.blocks!.map((block, i) =>
          block.type === "tool" ? (
            <ToolCard key={i} {...block} />
          ) : (
            <div key={i} className={styles.body}>
              <MarkdownContent content={block.content} />
            </div>
          )
        )
      ) : (
        <>
          {showDots && (
            <div className={styles.body}>
              <StreamingIndicator />
            </div>
          )}
          {!showDots && message.events && message.events.length > 0 && (
            <div className={styles.body}>
              <p>Your day:</p>
              <div className={styles.eventsBlock}>
                {message.events.map((ev, i) => (
                  <EventLine key={i} time={ev.time} name={ev.name} meta={ev.meta} />
                ))}
              </div>
              {message.content && <MarkdownContent content={message.content} />}
            </div>
          )}
          {!showDots && (!message.events || message.events.length === 0) && message.content && (
            <div className={styles.body}>
              {isUser ? (
                <p className={styles.userBody}>{message.content}</p>
              ) : message.isError ? (
                <p className={styles.errorText}>{message.content}</p>
              ) : (
                <MarkdownContent content={message.content} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
