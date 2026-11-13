import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SwipeRow } from "@/components/shell/SwipeRow";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { ViewPicker } from "@/components/shell/ViewPicker";
import { cn } from "@/lib/utils";
import {
  createBacklogItem,
  getBacklogItem,
  listBacklog,
  approveBacklogItem,
  updateBacklogItem,
  type BacklogItem,
  type BacklogType,
  type BacklogView,
} from "@/api/backlog";
import { errorText } from "@/api/homelab";
import { JobSheet } from "@/features/jobs/JobSheet";
import { useShellStore } from "@/nav/shellFlag";
import { useNavStore } from "@/store/navStore";
import { useUiStore } from "@/store/uiStore";
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
  const hubs = useShellStore((s) => s.shell) === "hubs";
  const navItem = useNavStore((s) => s.open.work);
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

  const linkedItem = useUiStore((s) => s.linkedBacklogItem);
  const setLinkedItem = useUiStore((s) => s.setLinkedBacklogItem);

  useEffect(() => {
    const id = hubs
      ? navItem?.kind === "backlog"
        ? navItem.id
        : null
      : linkedItem;
    if (!id) return;
    if (!hubs) setLinkedItem(null);
    getBacklogItem(id)
      .then(setOpenItem)
      .catch((err) => setError(errorText(err)));
  }, [hubs, linkedItem, navItem, setLinkedItem]);

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

  async function approve(item: BacklogItem) {
    setLoading(true);
    setError(null);
    try {
      await approveBacklogItem(item.id, item.repos[0], "");
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  async function park(item: BacklogItem) {
    setLoading(true);
    setError(null);
    try {
      await updateBacklogItem(item.id, { status: "dismissed" });
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  function open(id: string) {
    if (hubs) {
      useNavStore.getState().openItem({ kind: "backlog", id });
    } else {
      const item = items?.find((candidate) => candidate.id === id);
      if (item) setOpenItem(item);
    }
  }

  function close() {
    setOpenItem(null);
    if (hubs) useNavStore.getState().closeItem();
  }

  const viewChoices = VIEWS.map(([id, label]) => ({ id, label }));
  const typeChoices = [
    { id: "all", label: "All" },
    ...(Object.keys(TYPE_LABEL) as BacklogType[]).map((id) => ({ id, label: TYPE_LABEL[id] })),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      {!hubs && (
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
      )}

      {hubs && (
        <ToolsRow
          picker={
            <>
              <ViewPicker
                title="Board view"
                choices={viewChoices}
                value={view}
                onChange={(id) => setView(id as BacklogView)}
              />
              <ViewPicker
                title="Board type"
                choices={typeChoices}
                value={type ?? "all"}
                onChange={(id) => setType(id === "all" ? null : (id as BacklogType))}
              />
            </>
          }
          action={{ label: "Add item", onClick: () => setAdding((v) => !v) }}
        />
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
        {items && items.length > 0 &&
          // Open items split into Pryce's saved priority order and everything not prioritized yet.
          (view === "open"
            ? [
                { label: "Priority", rows: items.filter((i) => i.rank != null) },
                { label: "Not prioritized yet", rows: items.filter((i) => i.rank == null) },
              ]
            : [{ label: "", rows: items }]
          )
            .filter((section) => section.rows.length > 0)
            .map((section) => (
          <section key={section.label || "all"} aria-label={section.label || undefined} className="flex flex-col gap-1.5">
            {section.label && <h2 className="px-1 text-xs font-medium text-muted">{section.label}</h2>}
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {section.rows.map((i) => {
              const work = workLabel(i);
              return (
                <li key={i.id}>
                  <SwipeRow onSwipeLeft={() => park(i)}>
                    <div className="flex min-h-[56px] items-center gap-2 px-3 py-2 transition-colors hover:bg-surface">
                      <button
                        type="button"
                        onClick={() => open(i.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        {view === "open" && i.rank != null && (
                          <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-muted">
                            {i.rank}
                          </span>
                        )}
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="line-clamp-2 text-sm text-ink [overflow-wrap:anywhere]">{i.title}</span>
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
                      {(i.status === "new" || i.status === "shortlisted") && i.repos.length === 1 && (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={(event) => {
                            event.stopPropagation();
                            approve(i);
                          }}
                          className="shrink-0 rounded-md border border-line px-2 py-1 text-caption text-primary transition-colors hover:bg-raised disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </SwipeRow>
                </li>
              );
            })}
          </ul>
          </section>
            ))}
        </div>
      </div>

      <BacklogSheet
        item={openItem}
        rankedCount={(items ?? []).filter((i) => i.rank != null && (i.status === "new" || i.status === "shortlisted")).length}
        onClose={close}
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
