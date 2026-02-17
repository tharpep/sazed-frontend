import { useState } from "react";
import styles from "./InputBar.module.css";

export function InputBar() {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  const showCursor = value === "" && !focused;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      setValue("");
    }
  }

  return (
    <div className={styles.bar}>
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
