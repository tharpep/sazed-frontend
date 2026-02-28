import { useRef, useEffect, useState } from "react";
import { useChatStore } from "../../store/chatStore";
import { Message } from "./Message";
import styles from "./ChatArea.module.css";

export function ChatArea() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const areaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevStreamingRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const rafId = useRef(0);

  // Cancel pending rAF on unmount
  useEffect(() => () => { if (rafId.current) cancelAnimationFrame(rafId.current); }, []);

  function isNearBottom() {
    const el = areaRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }

  function handleScroll() {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      const next = !isNearBottom();
      setShowScrollBtn((prev) => (prev === next ? prev : next));
    });
  }

  function scrollToBottom(smooth = false) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }

  useEffect(() => {
    const justStartedStreaming = isStreaming && !prevStreamingRef.current;
    prevStreamingRef.current = isStreaming;

    const nearBottom = isNearBottom();
    if (justStartedStreaming || nearBottom) {
      scrollToBottom();
    }
    setShowScrollBtn(!nearBottom);
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
          onClick={() => scrollToBottom(true)}
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
