import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Page, PageBody } from "@/components/system";
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
} from "@/api/backlog";
import { errorText } from "@/api/homelab";
import { JobSheet } from "@/features/jobs/JobSheet";
import { SUB_CHOICES, useNavStore, useSub } from "@/store/navStore";
import { BacklogSheet } from "./BacklogSheet";
import { STATUS_LABEL, TYPE_LABEL, ageLabel, isOpenStatus, sourceLabel, workLabel } from "./format";

const REFRESH_MS = 30_000;

const VIEW_LABEL = { open: "Open", done: "Approved", dismissed: "Dismissed" } as const;

const VIEW_CHOICES = SUB_CHOICES["work:board"].map((id) => ({ id, label: VIEW_LABEL[id] }));
const TYPE_CHOICES = SUB_CHOICES["work:board.type"].map((id) => ({
  id,
  label: id === "all" ? "All" : TYPE_LABEL[id],
}));

const field =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary";

export function BacklogPage() {
  const navItem = useNavStore((s) => s.open.work);
  const openId = navItem?.kind === "backlog" ? navItem.id : null;
  const view = useSub("work:board");
  const typeChoice = useSub("work:board.type");
  const type = typeChoice === "all" ? undefined : typeChoice;
  const [items, setItems] = useState<BacklogItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  // Held apart from the list so the sheet stays on an item that just moved to another view.
  const [fetched, setFetched] = useState<BacklogItem | null>(null);
  const openItem = fetched && fetched.id === openId ? fetched : null;
  const [jobId, setJobId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ type: BacklogType; title: string; summary: string }>({
    type: "bug",
    title: "",
    summary: "",
  });
  const [addError, setAddError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!openId) return;
    let live = true;
    getBacklogItem(openId)
      .then((item) => live && setFetched(item))
      .catch((err) => live && setError(errorText(err)));
    return () => {
      live = false;
    };
  }, [openId]);

  // Only the newest request may land, so a slow answer for the last filter never replaces this one.
  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const next = await listBacklog(view, type);
      if (id !== requestId.current) return;
      setItems(next);
      setError(null);
    } catch (err) {
      if (id === requestId.current) setError(errorText(err));
    }
  }, [view, type]);

  useEffect(() => {
    setItems(null);
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

  async function act(fn: () => Promise<unknown>) {
    setActing(true);
    setActionError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setActing(false);
    }
  }

  function open(id: string) {
    useNavStore.getState().openItem({ kind: "backlog", id });
  }

  function close() {
    useNavStore.getState().closeItem("backlog");
  }

  const sections =
    items && items.length > 0
      ? // Open items split into Pryce's saved priority order and everything not prioritized yet.
        (view === "open"
          ? [
              { label: "Priority", rows: items.filter((i) => i.rank != null) },
              { label: "Not prioritized yet", rows: items.filter((i) => i.rank == null) },
            ]
          : [{ label: "", rows: items }]
        ).filter((section) => section.rows.length > 0)
      : [];

  function row(i: BacklogItem): ReactNode {
    const work = workLabel(i);
    const content = (
      <div className="flex min-h-[56px] items-center gap-2 px-3 py-2 transition-colors hover:bg-surface">
        <button type="button" onClick={() => open(i.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {view === "open" && i.rank != null && (
            <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-muted">{i.rank}</span>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="line-clamp-2 text-sm text-ink [overflow-wrap:anywhere]">{i.title}</span>
            <span className="truncate text-xs text-muted">
              <span className={cn(i.status === "shortlisted" && "text-accent")}>{STATUS_LABEL[i.status]}</span>
              {" · "}
              {[TYPE_LABEL[i.type], work, sourceLabel(i.source), ageLabel(i.created_at)].filter(Boolean).join(" · ")}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
        {isOpenStatus(i.status) && i.repos.length === 1 && (
          <button
            type="button"
            disabled={acting}
            onClick={(event) => {
              event.stopPropagation();
              act(() => approveBacklogItem(i.id, i.repos[0], ""));
            }}
            className="min-h-11 shrink-0 rounded-md border border-line px-3 text-caption text-primary transition-colors hover:bg-raised disabled:opacity-50 sm:min-h-7 sm:px-2"
          >
            Approve
          </button>
        )}
      </div>
    );
    // Only an open card can be parked; a swipe on an approved or done one would dismiss real work.
    if (!isOpenStatus(i.status)) return content;
    return (
      <SwipeRow onSwipeLeft={() => act(() => updateBacklogItem(i.id, { status: "dismissed" }))}>{content}</SwipeRow>
    );
  }

  return (
    <Page>
      <PageBody className="gap-4">
        <ToolsRow
          picker={
            // The two pickers scroll sideways at 360 so the action keeps its place on the row.
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none]">
              <ViewPicker
                title="Board view"
                choices={VIEW_CHOICES}
                value={view}
                onChange={(id) => useNavStore.getState().setSub("work:board", id as typeof view)}
              />
              <ViewPicker
                title="Board type"
                prefix="Type"
                choices={TYPE_CHOICES}
                value={typeChoice}
                onChange={(id) => useNavStore.getState().setSub("work:board.type", id as typeof typeChoice)}
              />
            </div>
          }
          action={{ label: "Add item", onClick: () => setAdding((v) => !v) }}
        />

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
            <Button
              className="h-11 self-end px-4 sm:h-7 sm:px-2.5"
              disabled={draft.title.trim().length < 3}
              onClick={add}
            >
              Add
            </Button>
          </section>
        )}

        {actionError && <p className="text-sm text-destructive">That didn't go through: {actionError}</p>}
        {error && <p className="text-sm text-destructive">Couldn't load the backlog: {error}</p>}
        {!items && !error && <p className="text-sm text-muted">Loading…</p>}
        {items && items.length === 0 && (
          <p className="px-1 text-sm text-muted">
            {view === "open"
              ? "Nothing open. The daily scout adds ideas here; you or Sazed can add bugs and gaps."
              : "Nothing here yet."}
          </p>
        )}
        {sections.map((section) => (
          <section
            key={section.label || "all"}
            aria-label={section.label || undefined}
            className="flex flex-col gap-1.5"
          >
            {section.label && <h2 className="px-1 text-xs font-medium text-muted">{section.label}</h2>}
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {section.rows.map((i) => (
                <li key={i.id}>{row(i)}</li>
              ))}
            </ul>
          </section>
        ))}
      </PageBody>

      <BacklogSheet
        item={openItem}
        rankedCount={(items ?? []).filter((i) => i.rank != null && isOpenStatus(i.status)).length}
        onClose={close}
        onChanged={(updated) => {
          // An action that finishes after the sheet closed or moved to another card must not bring it back.
          setFetched((cur) => (cur?.id === updated.id ? updated : cur));
          load();
        }}
        onOpenJob={(id) => {
          close();
          setJobId(id);
        }}
      />
      <JobSheet jobId={jobId} onClose={() => setJobId(null)} onChanged={load} onOpenJob={setJobId} />
    </Page>
  );
}
