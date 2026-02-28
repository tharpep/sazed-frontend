import { memo } from "react";
import type { Message as MessageType, ToolBlock } from "../../mock/data";
import { EventLine } from "./EventLine";
import { StreamingIndicator } from "./StreamingIndicator";
import { MarkdownContent } from "./MarkdownContent";
import { WidgetRenderer } from "../../widgets/WidgetRenderer";
import { ToolTray } from "./ToolTray";
import styles from "./Message.module.css";

interface MessageProps {
  message: MessageType;
  isLastStreaming?: boolean;
}

export const Message = memo(function Message({ message, isLastStreaming = false }: MessageProps) {
  const isUser = message.role === "user";
  const hasBlocks = !isUser && message.blocks && message.blocks.length > 0;

  // Separate tool blocks from content blocks
  const toolBlocks: ToolBlock[] = hasBlocks
    ? (message.blocks!.filter((b) => b.type === "tool") as ToolBlock[])
    : [];
  const visibleBlocks = hasBlocks
    ? message.blocks!.filter((b) => b.type !== "tool")
    : [];

  const showDots = isLastStreaming && !isUser && visibleBlocks.length === 0 && !message.content;

  return (
    <div className={`${styles.msg} ${!isUser ? styles.agentMsg : styles.userMsg}`}>
      <div className={`${styles.label} ${isUser ? styles.you : styles.agent}`}>
        {isUser ? "you" : "sazed"}
      </div>

      {/* Inline tool dropdown for this message */}
      {toolBlocks.length > 0 && <ToolTray tools={toolBlocks} />}

      {visibleBlocks.length > 0 ? (
        visibleBlocks.map((block, i) =>
          block.type === "ui" ? (
            <WidgetRenderer key={i} name={block.component} props={block.props} />
          ) : (
            <div key={i} className={styles.body}>
              <MarkdownContent content={block.content} isStreaming={isLastStreaming && i === visibleBlocks.length - 1} />
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
