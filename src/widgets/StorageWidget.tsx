import { gib } from "@/features/homelab/format";

import styles from "./StatusCard.module.css";

interface StoragePool {
  name: string;
  total_bytes: number;
  free_bytes: number;
}

interface StorageWidgetProps {
  pools: StoragePool[];
  media: {
    free_bytes?: number | null;
    downloads?: { not_imported: { count: number } } | null;
  };
}

/** Sizes and counts only, like the Homelab page: no titles. */
export function StorageWidget({ pools, media }: StorageWidgetProps) {
  const stuck = media.downloads?.not_imported.count ?? 0;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.label}>Storage</span>
      </div>
      {media.free_bytes != null && (
        <span className={styles.title}>{gib(media.free_bytes)} GB free for media</span>
      )}
      <div className={`${styles.list} ${styles.meta}`}>
        {pools.slice(0, 3).map((pool) => (
          <div key={pool.name} className={styles.row}>
            <span className={styles.rowTitle}>{pool.name}</span>
            <span className={styles.rowMeta}>
              {gib(pool.free_bytes)} of {gib(pool.total_bytes)} GB free
            </span>
          </div>
        ))}
      </div>
      {stuck > 0 && (
        <span className={`${styles.meta} ${styles.attention}`}>
          {stuck} finished {stuck === 1 ? "download" : "downloads"} not imported
        </span>
      )}
    </div>
  );
}
