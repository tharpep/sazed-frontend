import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

import { useChatStore } from "@/store/chatStore";
import { MessageBlock } from "@/features/chat/MessageBlock";

export function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const sessionId = useChatStore((s) => s.sessionId);
  const areaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevStreamingRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const rafId = useRef(0);

  useEffect(() => () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
  }, []);

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

  // Switching to a different conversation (via History) should land on its
  // most recent turn, not wherever the scroll container happened to be.
  useEffect(() => {
    scrollToBottom();
  }, [sessionId]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={areaRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
          {messages.map((msg, i) => (
            <MessageBlock
              key={i}
              message={msg}
              index={i}
              isLastStreaming={isStreaming && i === messages.length - 1}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      {showScrollBtn && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to bottom"
          className="absolute bottom-4 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-bg text-muted shadow-floating transition-colors hover:text-ink"
        >
          <ArrowDown className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
