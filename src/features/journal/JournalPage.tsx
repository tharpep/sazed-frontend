import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Plus, Star, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  createEntry,
  deleteEntry,
  listEntries,
  listSubcategories,
  updateEntry,
} from "@/api/journal";
import type {
  EntryPage,
  JournalCategory,
  JournalEntry,
  JournalEntryCreate,
  JournalEntryUpdate,
} from "@/api/journal";

// ── Constants ────────────────────────────────────────────────────────────

// Active category. Personal is schema-ready on the backend but the UI surface
// for switching stays off until we explicitly enable it.
const ACTIVE_CATEGORY: JournalCategory = "career";

const PAGE_SIZE = 30;
const AUTOSAVE_MS = 2000;
const SAVED_FLASH_MS = 1500;

// Curated default subcategories per category. The editor dropdown shows
// these merged with the subcategories that already exist in the DB, deduped.
// Edit this list to add or remove options.
const DEFAULT_SUBCATEGORIES: Record<JournalCategory, string[]> = {
  career: ["Eli Lilly", "Side Projects", "Learning"],
  personal: [],
};

const ADD_NEW_VALUE = "__add_new__";

// ── localStorage helpers ─────────────────────────────────────────────────

const DEFAULT_SUB_KEY = (c: JournalCategory) => `journal_default_subcategory_${c}`;

function getDefaultSubcategory(category: JournalCategory): string {
  try {
    return localStorage.getItem(DEFAULT_SUB_KEY(category)) ?? "";
  } catch {
    return "";
  }
}

function setDefaultSubcategory(category: JournalCategory, value: string): void {
  try {
    if (value) localStorage.setItem(DEFAULT_SUB_KEY(category), value);
    else localStorage.removeItem(DEFAULT_SUB_KEY(category));
  } catch {
    /* ignore */
  }
}

// ── Date helpers ─────────────────────────────────────────────────────────

function fmtDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function groupByDate(entries: JournalEntry[]): [string, JournalEntry[]][] {
  const map = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const group = map.get(e.entry_date) ?? [];
    group.push(e);
    map.set(e.entry_date, group);
  }
  return [...map.entries()];
}

// ── Editor ───────────────────────────────────────────────────────────────

interface EditorProps {
  entry: JournalEntry | null; // null = new entry
  category: JournalCategory;
  subcategories: string[]; // merged defaults ∪ existing
  defaultSubcategory: string;
  onSaved: (entry: JournalEntry, wasNew: boolean, explicit: boolean) => void;
  onDeleted: (id: string) => void;
  onBack: () => void;
  onPinDefault: (value: string) => void;
}

function Editor({
  entry,
  category,
  subcategories,
  defaultSubcategory,
  onSaved,
  onDeleted,
  onBack,
  onPinDefault,
}: EditorProps) {
  const isNew = entry === null;
  const [title, setTitle] = useState(entry?.title ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [subcategory, setSubcategory] = useState(entry?.subcategory ?? defaultSubcategory);
  const [entryDate, setEntryDate] = useState(entry?.entry_date ?? todayISO());
  const [tagsStr, setTagsStr] = useState((entry?.tags ?? []).join(", "));
  const [editingBody, setEditingBody] = useState(isNew); // new entries start in edit mode
  const [showMeta, setShowMeta] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [currentId, setCurrentId] = useState<string | null>(entry?.id ?? null);

  const dirtyRef = useRef(false);
  const inFlightRef = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  // Focus title when opening a brand-new entry.
  useEffect(() => {
    if (isNew) titleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tags = useMemo(
    () => tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
    [tagsStr],
  );

  const canSave =
    subcategory.trim().length > 0 &&
    (title.trim().length > 0 || body.trim().length > 0);

  // Subcategory dropdown options: keep current value visible even if it isn't
  // in the list (e.g. a freshly-added subcategory before reload).
  const subOptions = useMemo(() => {
    const out = [...subcategories];
    const trimmed = subcategory.trim();
    if (trimmed && !out.includes(trimmed)) out.unshift(trimmed);
    return out;
  }, [subcategories, subcategory]);

  const save = useCallback(
    async (opts: { explicit: boolean } = { explicit: false }) => {
      // Guard against re-entry — manual taps, autosave, blur, and the
      // cmd+enter shortcut can all race otherwise.
      if (inFlightRef.current) return;
      if (!dirtyRef.current && !opts.explicit) return;
      if (!canSave) return;

      // Cancel any pending autosave; this call supersedes it.
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      inFlightRef.current = true;
      setStatus("saving");
      try {
        if (currentId) {
          const patch: JournalEntryUpdate = {
            title: title.trim() || "Untitled",
            body,
            subcategory: subcategory.trim(),
            entry_date: entryDate,
            tags,
          };
          const updated = await updateEntry(currentId, patch);
          dirtyRef.current = false;
          setStatus("saved");
          onSaved(updated, false, opts.explicit);
        } else {
          const payload: JournalEntryCreate = {
            category,
            subcategory: subcategory.trim(),
            title: title.trim() || "Untitled",
            body,
            entry_date: entryDate,
            tags,
          };
          const created = await createEntry(payload);
          dirtyRef.current = false;
          setCurrentId(created.id);
          setStatus("saved");
          onSaved(created, true, opts.explicit);
        }
      } catch (err) {
        console.error(err);
        setStatus("error");
      } finally {
        inFlightRef.current = false;
      }
    },
    [canSave, currentId, title, body, subcategory, entryDate, tags, category, onSaved],
  );

  function markDirty() {
    dirtyRef.current = true;
    setStatus("idle");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void save({ explicit: false });
    }, AUTOSAVE_MS);
  }

  // Flush pending save on unmount.
  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (dirtyRef.current && !inFlightRef.current) {
        void save({ explicit: false });
      }
    };
  }, [save]);

  // Keyboard: cmd/ctrl+enter saves and closes (explicit).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void save({ explicit: true });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  async function handleExplicitSave() {
    await save({ explicit: true });
    // save() clears dirtyRef only on success; on error it stays true and the
    // editor stays open so the user sees the error state and can retry.
    if (!dirtyRef.current) {
      onBack();
    }
  }

  async function handleDelete() {
    if (!currentId) {
      onBack();
      return;
    }
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    try {
      await deleteEntry(currentId);
    } catch (err) {
      console.error("Delete failed:", err);
      setStatus("error");
      return;
    }
    onDeleted(currentId);
    onBack();
  }

  function handleSubChange(value: string) {
    if (value === ADD_NEW_VALUE) {
      const name = window.prompt("New subcategory name:");
      const trimmed = name?.trim() ?? "";
      if (trimmed) {
        setSubcategory(trimmed);
        markDirty();
      }
      return;
    }
    setSubcategory(value);
    markDirty();
  }

  const isDefault = subcategory.trim() === defaultSubcategory && subcategory.trim() !== "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          aria-label="Back to list"
          title="Back"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <input
          ref={titleRef}
          placeholder="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
          }}
          onBlur={() => dirtyRef.current && save({ explicit: false })}
          className="min-w-0 flex-1 bg-transparent text-lg font-medium text-ink outline-none placeholder:text-muted"
        />
        <span className="shrink-0 text-xs text-muted" aria-live="polite">
          {status === "saving" ? "saving…" : status === "saved" ? "saved" : status === "error" ? "error" : ""}
        </span>
        {currentId && (
          <button
            onClick={handleDelete}
            aria-label="Delete entry"
            title="Delete entry"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <select
          value={subOptions.includes(subcategory) ? subcategory : ""}
          onChange={(e) => handleSubChange(e.target.value)}
          onBlur={() => dirtyRef.current && save({ explicit: false })}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-ink outline-none focus-visible:border-primary"
        >
          <option value="" disabled>
            — pick subcategory —
          </option>
          {subOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value={ADD_NEW_VALUE}>+ Add new…</option>
        </select>
        <button
          onClick={() => onPinDefault(isDefault ? "" : subcategory.trim())}
          disabled={!subcategory.trim()}
          title={isDefault ? "Default for this category" : "Set as default for this category"}
          aria-pressed={isDefault}
          className={cn(
            "flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-40",
            isDefault ? "text-accent" : "text-muted hover:text-ink"
          )}
        >
          <Star className="size-4" fill={isDefault ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        <button
          onClick={() => setShowMeta((v) => !v)}
          aria-expanded={showMeta}
          className="ml-auto rounded-md px-2 py-1 text-xs text-muted transition-colors hover:text-ink"
        >
          {showMeta ? "less" : "more"}
        </button>
      </div>

      {showMeta && (
        <div className="flex flex-wrap gap-4 border-b border-border px-4 py-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">date</span>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => {
                setEntryDate(e.target.value);
                markDirty();
              }}
              onBlur={() => dirtyRef.current && save({ explicit: false })}
              className="rounded-md border border-border bg-bg px-2 py-1 text-ink outline-none focus-visible:border-primary"
            />
          </label>
          <label className="flex flex-1 items-center gap-2 text-sm">
            <span className="text-muted">tags</span>
            <input
              placeholder="comma-separated"
              value={tagsStr}
              onChange={(e) => {
                setTagsStr(e.target.value);
                markDirty();
              }}
              onBlur={() => dirtyRef.current && save({ explicit: false })}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-ink outline-none placeholder:text-muted focus-visible:border-primary"
            />
          </label>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {editingBody ? (
          <textarea
            placeholder="What's on your mind? Markdown supported."
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              markDirty();
            }}
            onBlur={() => {
              if (dirtyRef.current) save({ explicit: false });
              if (body.trim()) setEditingBody(false);
            }}
            autoFocus={!isNew}
            className="size-full min-h-[240px] resize-none bg-transparent text-[0.9375rem] leading-[1.55] text-ink outline-none placeholder:text-muted"
          />
        ) : (
          <div
            onClick={() => setEditingBody(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditingBody(true);
            }}
            className="min-h-[240px] cursor-text text-[0.9375rem] leading-[1.55] text-ink"
          >
            {body.trim() ? (
              <div className="prose-journal">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
              </div>
            ) : (
              <span className="text-muted">Tap to start writing. Markdown supported.</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end border-t border-border px-4 py-3">
        <button
          onClick={handleExplicitSave}
          disabled={!canSave || status === "saving"}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-bg transition-opacity disabled:opacity-40"
        >
          {status === "saving" ? "saving…" : "save & close"}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function JournalPage() {
  const [category] = useState<JournalCategory>(ACTIVE_CATEGORY);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [defaultSub, setDefaultSub] = useState<string>(() => getDefaultSubcategory(ACTIVE_CATEGORY));
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  // Subcategory dropdown options: curated defaults ∪ existing-in-DB, deduped.
  const editorSubOptions = useMemo(() => {
    const out = [...DEFAULT_SUBCATEGORIES[category]];
    for (const s of subcategories) {
      if (!out.includes(s)) out.push(s);
    }
    return out;
  }, [category, subcategories]);

  // Debounce search input.
  useEffect(() => {
    const id = window.setTimeout(() => setQ(qInput.trim()), 300);
    return () => window.clearTimeout(id);
  }, [qInput]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page: EntryPage = await listEntries({
        category,
        subcategory: subFilter ?? undefined,
        q: q || undefined,
        limit: PAGE_SIZE,
      });
      setEntries(page.entries);
      setNextCursor(page.next_cursor);
      const subs = await listSubcategories(category);
      setSubcategories(subs);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [category, subFilter, q]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page: EntryPage = await listEntries({
        category,
        subcategory: subFilter ?? undefined,
        q: q || undefined,
        limit: PAGE_SIZE,
        cursor: nextCursor,
      });
      setEntries((prev) => [...prev, ...page.entries]);
      setNextCursor(page.next_cursor);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoadingMore(false);
    }
  }

  function handleNew() {
    setSelected(null);
    setCreating(true);
  }

  function handleBack() {
    setSelected(null);
    setCreating(false);
  }

  function handleSaved(saved: JournalEntry, wasNew: boolean, explicit: boolean) {
    setEntries((prev) => {
      if (wasNew) return [saved, ...prev];
      return prev.map((e) => (e.id === saved.id ? saved : e));
    });
    if (saved.subcategory && !subcategories.includes(saved.subcategory)) {
      setSubcategories((prev) => [...prev, saved.subcategory].sort());
    }

    if (explicit) {
      // Editor closes itself; flash the row briefly so it's obvious where
      // the entry landed in the list.
      setLastSavedId(saved.id);
      window.setTimeout(() => {
        setLastSavedId((id) => (id === saved.id ? null : id));
      }, SAVED_FLASH_MS);
      return;
    }

    // Silent (autosave / blur) path: keep the user in the editor, but make
    // sure a newly-created entry has its id so subsequent autosaves PATCH.
    if (wasNew) {
      setSelected(saved);
      setCreating(false);
    }
  }

  function handleDeleted(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelected(null);
    setCreating(false);
  }

  function handlePinDefault(value: string) {
    setDefaultSubcategory(category, value);
    setDefaultSub(value);
  }

  // Keyboard: 'n' opens new, '/' focuses search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" ||
        (target?.isContentEditable ?? false);
      if (inField) return;
      if (e.key === "n") {
        e.preventDefault();
        handleNew();
      } else if (e.key === "/") {
        e.preventDefault();
        document.getElementById("journal-search")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const grouped = groupByDate(entries);
  const view = creating || selected ? "editor" : "list";

  // The editor key forces remount when switching between entries or to "new",
  // so internal state (title/body/etc.) resets cleanly.
  const editorKey = creating ? "new" : selected?.id ?? "none";

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden bg-bg min-[900px]:grid-cols-[340px_1fr]">
      <aside
        className={cn(
          "relative min-h-0 flex-col overflow-hidden border-r border-border min-[900px]:flex",
          view === "list" ? "flex" : "hidden"
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <input
            id="journal-search"
            type="search"
            placeholder="Search entries…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary"
          />
          <button
            onClick={handleNew}
            aria-label="New entry"
            title="New entry (n)"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-bg transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>

        {subcategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
            <button
              onClick={() => setSubFilter(null)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                subFilter === null
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted hover:text-ink"
              )}
            >
              all
            </button>
            {subcategories.map((s) => (
              <button
                key={s}
                onClick={() => setSubFilter(s)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  subFilter === s
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted hover:text-ink"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {loading && <p className="px-2 py-1 text-sm text-muted">Loading…</p>}
          {error && <p className="px-2 py-1 text-sm text-destructive">{error}</p>}

          {!loading && !error && entries.length === 0 && (
            <p className="px-2 py-1 text-sm text-muted">
              {q ? `No entries match "${q}".` : "No entries yet. Tap + to start logging."}
            </p>
          )}

          {!loading && entries.length > 0 && (
            <>
              {grouped.map(([date, group]) => (
                <div key={date}>
                  <div className="px-2 py-1 text-xs font-medium tracking-wide text-muted">
                    {fmtDateLabel(date)}
                  </div>
                  {group.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => {
                        setCreating(false);
                        setSelected(entry);
                      }}
                      className={cn(
                        "relative flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface",
                        selected?.id === entry.id && "bg-surface",
                        lastSavedId === entry.id && "bg-primary/10"
                      )}
                    >
                      <span className="w-full truncate text-sm text-ink">{entry.title}</span>
                      <span className="flex w-full items-center gap-1.5 text-xs text-muted">
                        <span>{entry.subcategory}</span>
                        {entry.tags.slice(0, 2).map((t) => (
                          <span key={t} className="rounded bg-surface px-1 py-0.5">
                            {t}
                          </span>
                        ))}
                      </span>
                      {lastSavedId === entry.id && (
                        <span className="absolute right-2 top-1.5 text-xs text-primary" aria-hidden>
                          saved ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
              {nextCursor && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full rounded-md px-2 py-1.5 text-xs text-muted transition-colors hover:text-ink disabled:opacity-50"
                >
                  {loadingMore ? "loading…" : "load more"}
                </button>
              )}
            </>
          )}
        </div>
      </aside>

      <main
        className={cn(
          "min-h-0 flex-col overflow-hidden min-[900px]:flex",
          view === "editor" ? "flex" : "hidden"
        )}
      >
        {view === "editor" ? (
          <Editor
            key={editorKey}
            entry={selected}
            category={category}
            subcategories={editorSubOptions}
            defaultSubcategory={defaultSub}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onBack={handleBack}
            onPinDefault={handlePinDefault}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm text-ink">Select an entry</p>
            <p className="text-xs text-muted">
              or press <kbd className="rounded border border-border px-1 py-0.5">n</kbd> for a new entry
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
