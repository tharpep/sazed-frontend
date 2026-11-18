import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

import { listKbSources, type KbSource } from "@/api/kb";
import { errorText } from "@/api/homelab";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { useNavStore } from "@/store/navStore";
import { AddContent } from "./AddContent";
import { MemorySection } from "./MemorySection";
import { SearchPanel } from "./SearchPanel";
import { SourceSheet } from "./SourceSheet";
import { ORIGIN_LABEL, addedAgo } from "./format";

export function KnowledgePage() {
  const navSource = useNavStore((s) => s.open["library:knowledge"]);
  const [sources, setSources] = useState<KbSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await listKbSources();
      // Rows marked deleted/error are leftovers from the old Drive sync.
      setSources(s.filter((x) => x.status === "active"));
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(
    () => [...new Set((sources ?? []).map((s) => s.category).filter(Boolean))].sort(),
    [sources]
  );
  const open = navSource?.kind === "source" ? navSource.id : null;

  function openSource(fileId: string) {
    useNavStore.getState().openItem({ kind: "source", id: fileId });
  }

  function closeSource() {
    useNavStore.getState().closeItem("source");
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="px-4 pt-3 sm:px-8">
        <ToolsRow action={{ label: "Add source", onClick: () => setAdding((value) => !value) }} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-4 pb-8">
          {adding && <AddContent categories={categories} onAdded={load} />}

          <SearchPanel onOpenSource={openSource} />

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
                      onClick={() => openSource(s.file_id)}
                      aria-current={open === s.file_id ? "true" : undefined}
                      className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface aria-[current=true]:bg-surface"
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
        onClose={closeSource}
        onDeleted={load}
      />
    </div>
  );
}
