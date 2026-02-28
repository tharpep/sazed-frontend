import { useState } from "react";
import type { ToolBlock } from "../../mock/data";
import { ToolCard } from "./ToolCard";
import styles from "./ToolTray.module.css";

interface ToolTrayProps {
  tools: ToolBlock[];
}

export function ToolTray({ tools }: ToolTrayProps) {
  const [open, setOpen] = useState(false);

  if (tools.length === 0) return null;

  const pendingCount = tools.filter((t) => t.status === "pending").length;

  return (
    <div className={styles.tray}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 6 15 12 9 18" />
        </svg>
        <span className={styles.label}>
          {pendingCount > 0
            ? `${tools.length - pendingCount}/${tools.length} tools`
            : `${tools.length} tool${tools.length > 1 ? "s" : ""} used`}
        </span>
      </button>
      {open && (
        <div className={styles.grid}>
          {tools.map((t, i) => (
            <ToolCard
              key={i}
              name={t.name}
              category={t.category}
              label={t.label}
              done={t.done}
              status={t.status}
              error={t.error}
            />
          ))}
        </div>
      )}
    </div>
  );
}
