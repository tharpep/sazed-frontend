import { useRef, useEffect } from "react";
import { useChatStore } from "../../store/chatStore";
import { Message } from "./Message";
import { StreamingIndicator } from "./StreamingIndicator";
import styles from "./ChatArea.module.css";

export function ChatArea() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  return (
    <div className={styles.area}>
      <div className={styles.content}>
        {messages.map((msg, i) => (
          <Message key={i} message={msg} />
        ))}
        {isStreaming && <StreamingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
