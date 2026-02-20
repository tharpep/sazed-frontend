import { useState, useRef, useCallback } from "react";
import styles from "./InputBar.module.css";

interface InputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  historyOpen?: boolean;
  onToggleHistory?: () => void;
}

export function InputBar({ onSend, disabled = false, historyOpen = false, onToggleHistory }: InputBarProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [sendPulse, setSendPulse] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showCursor = value === "" && !focused;
  const canSend = value.trim() !== "" && !disabled;

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      setSendPulse(true);
      setTimeout(() => setSendPulse(false), 300);
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

  return (
    <div className={`${styles.bar} ${disabled ? styles.disabled : ""}`}>
      <div className={styles.row}>
        {/* Mobile-only: history toggle on the left */}
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

        <span className={styles.prompt}>›</span>
        <textarea
          ref={textareaRef}
          rows={1}
          className={styles.input}
          placeholder="ask sazed anything..."
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
        />
        {showCursor && <span className={styles.cursor} />}

        {/* Mobile-only: send button on the right */}
        <button
          type="button"
          className={`${styles.mobileBtn} ${canSend ? styles.sendActive : ""} ${sendPulse ? styles.sendPulse : ""}`}
          onClick={handleSend}
          aria-label="Send"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
