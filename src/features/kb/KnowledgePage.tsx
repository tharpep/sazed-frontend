import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { getKbStats, listKbSources, type KbSource, type KbStats } from "@/api/kb";
import { errorText } from "@/api/homelab";
import { AddContent } from "./AddContent";
import { MemorySection } from "./MemorySection";
import { SearchPanel } from "./SearchPanel";
import { SourceSheet } from "./SourceSheet";
import { ORIGIN_LABEL, addedAgo } from "./format";

export function KnowledgePage() {
  const [sources, setSources] = useState<KbSource[] | null>(null);
  const [stats, setStats] = useState<KbStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, st] = await Promise.all([listKbSources(), getKbStats()]);
      // Rows marked deleted/error are leftovers from the old Drive sync.
      setSources(s.filter((x) => x.status === "active"));
      setStats(st);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(
    () => [...new Set((sources ?? []).map((s) => s.category).filter(Boolean))].sort(),
    [sources]
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="text-base font-semibold text-ink">Knowledge</h1>
          {stats && (
            <span className="truncate text-xs text-muted">
              {stats.file_count} sources · {stats.chunk_count} chunks
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Refresh"
          title="Refresh"
          className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-4 pb-8">
          <AddContent categories={categories} onAdded={load} />

          <SearchPanel onOpenSource={setOpen} />

          <section aria-label="Sources" className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-medium text-ink">Sources</h2>
            {error && <p className="text-sm text-destructive">Couldn't load sources: {error}</p>}
            {!sources && !error && <p className="text-sm text-muted">Loading…</p>}
            {sources && sources.length === 0 && (
              <p className="px-1 text-sm text-muted">
                Nothing indexed yet. Add a file, some text or a web page above, or ask Sazed to save
                something to the knowledge base.
              </p>
            )}
            {sources && sources.length > 0 && (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {sources.map((s) => (
                  <li key={s.file_id}>
                    <button
                      type="button"
                      onClick={() => setOpen(s.file_id)}
                      className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm text-ink">{s.filename}</span>
                        <span className="truncate text-xs text-muted">
                          {[
                            ORIGIN_LABEL[s.origin] ?? s.origin,
                            s.category || null,
                            `${s.chunk_count} chunks`,
                            addedAgo(s.last_synced),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <MemorySection />
        </div>
      </div>

      <SourceSheet
        fileId={open}
        source={sources?.find((s) => s.file_id === open)}
        onClose={() => setOpen(null)}
        onDeleted={load}
      />
    </div>
  );
}
