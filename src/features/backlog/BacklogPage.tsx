import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createBacklogItem,
  listBacklog,
  type BacklogItem,
  type BacklogType,
  type BacklogView,
} from "@/api/backlog";
import { errorText } from "@/api/homelab";
import { JobSheet } from "@/features/jobs/JobSheet";
import { BacklogSheet } from "./BacklogSheet";
import { STATUS_LABEL, TYPE_LABEL, ageLabel, sourceLabel, workLabel } from "./format";

const REFRESH_MS = 30_000;

const VIEWS: [BacklogView, string][] = [
  ["open", "Open"],
  ["done", "Approved"],
  ["dismissed", "Dismissed"],
];

const field =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary";

export function BacklogPage() {
  const [view, setView] = useState<BacklogView>("open");
  const [type, setType] = useState<BacklogType | null>(null);
  const [items, setItems] = useState<BacklogItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Held apart from the list so the sheet stays on an item that just moved to another view.
  const [openItem, setOpenItem] = useState<BacklogItem | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ type: BacklogType; title: string; summary: string }>({
    type: "bug",
    title: "",
    summary: "",
  });
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listBacklog(view, type ?? undefined));
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [view, type]);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  async function add() {
    setAddError(null);
    try {
      await createBacklogItem({ type: draft.type, title: draft.title.trim(), summary: draft.summary.trim() });
      setDraft({ type: draft.type, title: "", summary: "" });
      setAdding(false);
      await load();
    } catch (err) {
      setAddError(errorText(err));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div role="tablist" aria-label="Which items" className="flex gap-1 rounded-md bg-surface p-0.5">
          {VIEWS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "rounded px-3 py-1 text-sm transition-colors",
                view === v ? "bg-bg font-semibold text-ink shadow-sm" : "text-muted hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
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
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            aria-label="Add an item"
            title="Add an item"
            className="flex size-9 items-center justify-center rounded-md bg-primary text-bg transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
          {([null, ...(Object.keys(TYPE_LABEL) as BacklogType[])] as (BacklogType | null)[]).map((t) => (
            <button
              key={t ?? "all"}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                type === t ? "border-primary bg-primary/10 text-ink" : "border-border text-muted hover:text-ink"
              )}
            >
              {t ? TYPE_LABEL[t] : "All"}
            </button>
          ))}
        </div>

        {adding && (
          <section aria-label="Add an item" className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex gap-2">
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as BacklogType })}
                aria-label="Type"
                className={cn(field, "w-auto")}
              >
                {(Object.keys(TYPE_LABEL) as BacklogType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                aria-label="Title"
                placeholder="Short title"
                className={field}
              />
            </div>
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              rows={3}
              aria-label="Details"
              placeholder="Details (optional, markdown)"
              className={cn(field, "resize-y")}
            />
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <Button size="sm" className="self-end" disabled={draft.title.trim().length < 3} onClick={add}>
              Add
            </Button>
          </section>
        )}

        {error && <p className="text-sm text-destructive">Couldn't load the backlog: {error}</p>}
        {!items && !error && <p className="text-sm text-muted">Loading…</p>}
        {items && items.length === 0 && (
          <p className="px-1 text-sm text-muted">
            {view === "open"
              ? "Nothing open. The daily scout adds ideas here; you or Sazed can add bugs and gaps."
              : "Nothing here yet."}
          </p>
        )}
        {items && items.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {items.map((i) => {
              const work = workLabel(i);
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => setOpenItem(i)}
                    className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm text-ink">{i.title}</span>
                      <span className="truncate text-xs text-muted">
                        <span className={cn(i.status === "shortlisted" && "text-accent")}>
                          {STATUS_LABEL[i.status]}
                        </span>
                        {" · "}
                        {[TYPE_LABEL[i.type], work, sourceLabel(i.source), ageLabel(i.created_at)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BacklogSheet
        item={openItem}
        onClose={() => setOpenItem(null)}
        onChanged={(updated) => {
          setOpenItem(updated);
          load();
        }}
        onOpenJob={(id) => {
          setOpenItem(null);
          setJobId(id);
        }}
      />
      <JobSheet jobId={jobId} onClose={() => setJobId(null)} onChanged={load} onOpenJob={setJobId} />
    </div>
  );
}
