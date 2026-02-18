import { KbPanel } from "./KbPanel";
import { MemoryPanel } from "./MemoryPanel";
import styles from "./KbPage.module.css";

export function KbPage() {
  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <KbPanel />
      </div>
      <div className={styles.right}>
        <MemoryPanel />
      </div>
    </div>
  );
}
