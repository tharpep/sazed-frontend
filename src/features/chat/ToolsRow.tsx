import type { ToolCall } from "../../mock/data";
import { ToolCard } from "./ToolCard";
import styles from "./ToolsRow.module.css";

interface ToolsRowProps {
  tools: ToolCall[];
}

export function ToolsRow({ tools }: ToolsRowProps) {
  return (
    <div className={styles.row}>
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
  );
}
