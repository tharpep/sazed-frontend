import { memo } from "react";
import type { Message as MessageType } from "../../mock/data";
import { ToolCard } from "./ToolCard";
import { EventLine } from "./EventLine";
import { StreamingIndicator } from "./StreamingIndicator";
import { MarkdownContent } from "./MarkdownContent";
import { WidgetRenderer } from "../../widgets/WidgetRenderer";
import styles from "./Message.module.css";

interface MessageProps {
  message: MessageType;
  isLastStreaming?: boolean;
}

export const Message = memo(function Message({ message, isLastStreaming = false }: MessageProps) {
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
          ) : block.type === "ui" ? (
            <WidgetRenderer key={i} name={block.component} props={block.props} />
          ) : (
            <div key={i} className={styles.body}>
              <MarkdownContent content={block.content} isStreaming={isLastStreaming && i === message.blocks!.length - 1} />
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
              {message.content && <MarkdownContent content={message.content} isStreaming={isLastStreaming} />}
            </div>
          )}
          {!showDots && (!message.events || message.events.length === 0) && message.content && (
            <div className={styles.body}>
              {isUser ? (
                <p className={styles.userBody}>{message.content}</p>
              ) : message.isError ? (
                <p className={styles.errorText}>{message.content}</p>
              ) : (
                <MarkdownContent content={message.content} isStreaming={isLastStreaming} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});
