import { useState } from "react";
import styles from "./InputBar.module.css";

interface InputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function InputBar({ onSend, disabled = false }: InputBarProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  const showCursor = value === "" && !focused;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed && !disabled) {
        onSend(trimmed);
        setValue("");
      }
    }
  }

  return (
    <div className={`${styles.bar} ${disabled ? styles.disabled : ""}`}>
      <div className={styles.row}>
        <span className={styles.prompt}>›</span>
        <input
          type="text"
          className={styles.input}
          placeholder="ask sazed anything..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
        />
        {showCursor && <span className={styles.cursor} />}
      </div>
    </div>
  );
}
