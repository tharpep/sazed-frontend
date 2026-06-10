import { useState, useRef, useCallback } from "react";
import styles from "./InputBar.module.css";

interface InputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  historyOpen?: boolean;
  onToggleHistory?: () => void;
  /** "docked" pins it to the bottom during a conversation; "hero" centers it as
      the focal command bar on the dashboard. */
  variant?: "docked" | "hero";
  placeholder?: string;
}

export function InputBar({
  onSend,
  disabled = false,
  historyOpen = false,
  onToggleHistory,
  variant = "docked",
  placeholder = "Ask Sazed anything…",
}: InputBarProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim() !== "" && !disabled;

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
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
    <div className={`${isHero ? styles.hero : styles.bar} ${disabled ? styles.disabled : ""}`}>
      <div className={styles.row}>
        {/* Mobile-only history toggle — docked variant only */}
        {!isHero && (
          <button
            type="button"
            className={`${styles.mobileBtn} ${historyOpen ? styles.mobileBtnActive : ""}`}
            onClick={onToggleHistory}
            aria-label="Conversations"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}

        <div className={`${styles.composer} ${isHero ? styles.composerHero : ""}`}>
          <span className={styles.prompt}>›</span>
          <textarea
            ref={textareaRef}
            rows={1}
            className={styles.input}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus={isHero}
          />
          <button
            type="button"
            className={`${styles.send} ${canSend ? styles.sendActive : ""}`}
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
