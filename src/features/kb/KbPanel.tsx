import { useEffect, useState } from "react";
import { useKbStore } from "../../store/kbStore";
import type { KbSource } from "../../api/kb";
import styles from "./KbPanel.module.css";

const CATEGORY_COLORS: Record<string, string> = {
  general: styles.catBlue,
  projects: styles.catGreen,
  purdue: styles.catAmber,
  career: styles.catPurple,
  reference: styles.catRed,
};

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SourceRow({ source, onDelete }: { source: KbSource; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onDelete();
  }

  return (
    <div className={`${styles.row} ${source.status === "deleted" ? styles.deleted : ""}`}>
      <div className={styles.rowMain}>
        <span
          className={`${styles.catBadge} ${CATEGORY_COLORS[source.category] ?? styles.catBlue}`}
        >
          {source.category}
        </span>
        <span className={styles.filename} title={source.filename}>
          {source.filename}
        </span>
      </div>
      <div className={styles.rowMeta}>
        <span className={styles.meta}>{source.chunk_count} chunks</span>
        <span className={styles.meta}>{formatDate(source.last_synced)}</span>
        <button
          type="button"
          className={`${styles.deleteBtn} ${confirming ? styles.confirm : ""}`}
          onClick={handleDelete}
          onBlur={() => setConfirming(false)}
          title={confirming ? "Click again to confirm" : "Remove from index"}
        >
          {confirming ? "confirm?" : "×"}
        </button>
      </div>
    </div>
  );
}

export function KbPanel() {
  const stats = useKbStore((s) => s.stats);
  const sources = useKbStore((s) => s.sources);
  const loading = useKbStore((s) => s.loading);
  const syncing = useKbStore((s) => s.syncing);
  const error = useKbStore((s) => s.error);
  const lastSyncResult = useKbStore((s) => s.lastSyncResult);
  const load = useKbStore((s) => s.load);
  const sync = useKbStore((s) => s.sync);
  const removeFile = useKbStore((s) => s.removeFile);

  useEffect(() => {
    load();
  }, [load]);

  const activeSources = sources.filter((s) => s.status !== "deleted");

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>Knowledge Base</h3>
          {stats && (
            <span className={styles.statsChip}>
              {stats.chunk_count.toLocaleString()} chunks · {stats.file_count} files
            </span>
          )}
        </div>
        <div className={styles.syncRow}>
          <button
            type="button"
            className={styles.syncBtn}
            onClick={() => sync(false)}
            disabled={syncing}
          >
            {syncing ? "Syncing…" : "Sync Drive"}
          </button>
          <button
            type="button"
            className={styles.syncBtnSecondary}
            onClick={() => sync(true)}
            disabled={syncing}
            title="Re-sync all files, ignoring change detection"
          >
            Force
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {lastSyncResult && (
        <div className={styles.syncResult}>
          Synced {lastSyncResult.files_synced} · Skipped {lastSyncResult.files_skipped} ·
          Deleted {lastSyncResult.files_deleted} · {lastSyncResult.chunks_inserted} chunks inserted
          {lastSyncResult.errors.length > 0 && (
            <span className={styles.syncErrors}> · {lastSyncResult.errors.length} errors</span>
          )}
        </div>
      )}

      <div className={styles.list}>
        {loading && <div className={styles.empty}>Loading…</div>}
        {!loading && activeSources.length === 0 && (
          <div className={styles.empty}>No files indexed. Run a sync to get started.</div>
        )}
        {activeSources.map((source) => (
          <SourceRow
            key={source.file_id}
            source={source}
            onDelete={() => removeFile(source.file_id)}
          />
        ))}
      </div>
    </div>
  );
}
