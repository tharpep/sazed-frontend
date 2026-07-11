import { useCallback, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";

import { cn } from "@/lib/utils";

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

  const canSend = value.trim() !== "" && !disabled;

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [value, disabled, onSend]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
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
          className="max-h-40 flex-1 resize-none bg-transparent py-1 text-[0.9375rem] leading-[1.55] text-ink outline-none placeholder:text-muted"
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
