import { useRef, useEffect, useState } from "react";
import { useChatStore } from "../../store/chatStore";
import { Message } from "./Message";
import styles from "./ChatArea.module.css";

export function ChatArea() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const areaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  function isNearBottom() {
    const el = areaRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }

  function handleScroll() {
    setShowScrollBtn(!isNearBottom());
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    const userJustSent = lastMsg?.role === "user";
    if (userJustSent || isNearBottom()) {
      scrollToBottom();
    }
    setShowScrollBtn(!isNearBottom());
  }, [messages, isStreaming]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.area} ref={areaRef} onScroll={handleScroll}>
        <div className={styles.content}>
          {messages.map((msg, i) => (
            <Message
              key={i}
              message={msg}
              isLastStreaming={isStreaming && i === messages.length - 1}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      {showScrollBtn && (
        <button
          type="button"
          className={styles.scrollBtn}
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
