import { useState } from "react";
import { Search } from "lucide-react";

import { searchKb, type KbSearchHit } from "@/api/kb";
import { errorText } from "@/api/homelab";
import { cn } from "@/lib/utils";
import { chunkText, field } from "./format";

interface Props {
  onOpenSource: (fileId: string) => void;
}

// A test bench: shows what Sazed's search_knowledge_base would get back for a query.
export function SearchPanel({ onOpenSource }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<KbSearchHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    try {
      setHits(await searchKb(q));
    } catch (err) {
      setError(errorText(err));
      setHits(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Search the knowledge base" className="flex flex-col gap-2">
      <form onSubmit={run} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          enterKeyHint="search"
          placeholder="Test a search"
          aria-label="Search query"
          className={field}
        />
        <button
          type="submit"
          disabled={busy || !query.trim()}
          aria-label="Search"
          title="Search"
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
        >
          <Search className={cn("size-4", busy && "animate-pulse")} aria-hidden="true" />
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {hits && hits.length === 0 && <p className="text-sm text-muted">Nothing relevant found.</p>}
      {hits && hits.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {hits.map((h) => (
            <li key={`${h.drive_file_id}-${h.chunk_index}`}>
              <button
                type="button"
                onClick={() => onOpenSource(h.drive_file_id)}
                className="flex w-full flex-col gap-1 px-3 py-2 text-left transition-colors hover:bg-surface"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm text-ink">{h.filename}</span>
                  <span className="shrink-0 font-mono text-xs text-muted" title="Rerank score">
                    {h.rerank_score.toFixed(2)}
                  </span>
                </span>
                <span className="line-clamp-4 text-xs whitespace-pre-line text-muted">{chunkText(h.content)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
