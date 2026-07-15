import { useCallback, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  variant?: "docked" | "hero";
  placeholder?: string;
  autoFocus?: boolean;
}

export function Composer({
  onSend,
  disabled = false,
  isStreaming = false,
  onStop,
  variant = "docked",
  placeholder = "Ask Sazed anything…",
  autoFocus = false,
}: ComposerProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  const canSend = value.trim() !== "" && !disabled;

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Clicking Send (as opposed to pressing Enter) moves focus to the button —
    // reclaim it so the mobile keyboard stays open and typing can continue
    // without an extra tap.
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.focus();
    }
  }, [value, disabled, onSend]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Mobile: Enter always inserts a newline (default textarea behavior,
    // untouched here) — only the send button sends. Desktop: Enter sends,
    // Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey && !isMobile && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  const isHero = variant === "hero";

  return (
    <div className={cn(isHero ? "" : "border-t border-border px-4 py-3")}>
      <div
        className={cn(
          "mx-auto flex w-full items-end gap-2 rounded-2xl border border-border bg-surface px-3 py-2 transition-shadow duration-200 ease-out",
          isHero ? "max-w-xl" : "max-w-2xl",
          focused && "shadow-floating"
        )}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          placeholder={placeholder}
          enterKeyHint={isMobile ? "enter" : "send"}
          className="max-h-40 flex-1 resize-none bg-transparent py-1 text-base leading-[1.55] text-ink outline-none placeholder:text-muted sm:text-[0.9375rem]"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-bg transition-colors"
          >
            <Square className="size-3" fill="currentColor" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
              canSend ? "bg-primary text-bg" : "bg-surface text-muted"
            )}
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
