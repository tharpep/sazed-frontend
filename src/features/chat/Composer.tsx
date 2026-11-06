import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { jumpMatches } from "./pageJump";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  /** `ask` is Home's ask bar: aligned with the page, a "/" hint, and "/" jumps to pages. */
  variant?: "docked" | "hero" | "ask";
  placeholder?: string;
  autoFocus?: boolean;
}

export function Composer({
  onSend,
  disabled = false,
  isStreaming = false,
  onStop,
  variant = "docked",
  placeholder,
  autoFocus = false,
}: ComposerProps) {
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState(0);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  const canSend = value.trim() !== "" && !disabled;
  const isAsk = variant === "ask";
  const matches = isAsk ? jumpMatches(value) : null;
  const jumping = !!matches?.length;

  // "/" anywhere on Home focuses the bar, unless he's typing somewhere else.
  useEffect(() => {
    if (!isAsk) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      textareaRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAsk]);

  function jump(i: number) {
    const page = matches?.[i];
    if (!page) return;
    setValue("");
    page.open();
  }

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
    setPicked(0);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (jumping) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setPicked((i) => (i + step + matches.length) % matches.length);
        return;
      }
      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
        e.preventDefault();
        jump(Math.min(picked, matches.length - 1));
        return;
      }
    }
    if (isAsk && e.key === "Escape" && value) {
      e.preventDefault();
      e.stopPropagation();
      setValue("");
      return;
    }
    // Mobile: Enter always inserts a newline (default textarea behavior,
    // untouched here) — only the send button sends. Desktop: Enter sends,
    // Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey && !isMobile && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  const isHero = variant === "hero";
  const pickedIndex = jumping ? Math.min(picked, matches.length - 1) : -1;

  return (
    <div
      className={cn(
        isAsk ? "w-full max-w-5xl px-4 pb-3.5 md:px-8 md:pb-5" : isHero ? "" : "border-t border-border px-4 py-3"
      )}
    >
      <div
        className={cn(
          "relative flex w-full items-end gap-2 border bg-surface transition-shadow duration-200 ease-out",
          isAsk
            ? "rounded-[10px] border-line py-2 pr-2 pl-3.5"
            : cn("mx-auto rounded-2xl border-border px-3 py-2", isHero ? "max-w-xl" : "max-w-2xl"),
          focused && "shadow-floating"
        )}
      >
        {jumping && (
          <ul
            id="page-jump"
            role="listbox"
            aria-label="Jump to a page"
            className="absolute bottom-full left-0 mb-2 flex w-64 max-w-full flex-col rounded-[10px] border border-line bg-surface p-1 shadow-floating"
          >
            {matches.map((page, i) => (
              <li
                key={page.label}
                id={`page-jump-${i}`}
                role="option"
                aria-selected={i === pickedIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  jump(i);
                }}
                onMouseEnter={() => setPicked(i)}
                className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-body text-ink-2 aria-selected:bg-raised aria-selected:text-ink"
              >
                {page.label}
                {i === pickedIndex && <span className="text-caption text-muted">Enter</span>}
              </li>
            ))}
          </ul>
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          placeholder={placeholder ?? (isAsk ? "Ask Sazed, or type / to jump to a page" : "Ask Sazed anything…")}
          enterKeyHint={isMobile ? "enter" : "send"}
          role={isAsk ? "combobox" : undefined}
          aria-expanded={isAsk ? jumping : undefined}
          aria-controls={jumping ? "page-jump" : undefined}
          aria-activedescendant={jumping ? `page-jump-${pickedIndex}` : undefined}
          className={cn(
            "max-h-40 flex-1 resize-none bg-transparent py-1 text-base leading-[1.55] text-ink outline-none placeholder:text-muted",
            isAsk ? "sm:text-body sm:leading-5 sm:py-1" : "sm:text-[0.9375rem]"
          )}
        />
        {isAsk && !value && (
          <kbd className="mb-1.5 hidden rounded border border-line px-1.5 font-mono text-[11px] text-muted sm:block">/</kbd>
        )}
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className={cn(
              "flex size-7 shrink-0 items-center justify-center bg-primary text-bg transition-colors",
              isAsk ? "rounded-[7px]" : "rounded-full"
            )}
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
              "flex size-7 shrink-0 items-center justify-center transition-colors",
              isAsk
                ? "rounded-[7px] bg-primary text-bg"
                : cn("rounded-full", canSend ? "bg-primary text-bg" : "bg-surface text-muted")
            )}
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
