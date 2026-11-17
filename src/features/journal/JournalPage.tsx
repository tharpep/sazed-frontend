import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Star, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Reader } from "@/components/shell/Reader";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { ViewPicker } from "@/components/shell/ViewPicker";
import { useNavStore } from "@/store/navStore";
import {
  createEntry,
  deleteEntry,
  getEntry,
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
import { ACTIVE_CATEGORY } from "./journalItems";

// ── Constants ────────────────────────────────────────────────────────────

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
const ALL_SUBS = "__all__";

// Editor controls: 44px on phones, compact from 640px.
const ICON_BUTTON = "flex size-11 shrink-0 items-center justify-center rounded-md transition-colors sm:size-7";

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
  /** `closing`: the editor is closing (save & close, or a flush on unmount), not autosaving. */
  onSaved: (entry: JournalEntry, wasNew: boolean, closing: boolean) => void;
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
  // Counts edits, so a save that finishes after newer typing leaves the editor dirty.
  const editsRef = useRef(0);
  const inFlightRef = useRef(false);
  const closingRef = useRef(false);
  // The id a create returned, before the re-render that puts it in state, so a save right after
  // a create patches instead of creating the entry twice.
  const idRef = useRef<string | null>(entry?.id ?? null);
  const saveTimer = useRef<number | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  // Timers and the unmount flush outlive the render that set them, so they call the latest save.
  const saveRef = useRef<(opts?: { explicit: boolean }) => Promise<void>>(async () => {});

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      void saveRef.current({ explicit: false });
    }, AUTOSAVE_MS);
  }, []);

  // Focus title when opening a brand-new entry.
  useEffect(() => {
    if (isNew) titleRef.current?.focus();
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
      const edits = editsRef.current;
      const closing = opts.explicit || closingRef.current;
      setStatus("saving");
      let succeeded = false;
      try {
        let saved: JournalEntry;
        const id = idRef.current;
        if (id) {
          const patch: JournalEntryUpdate = {
            title: title.trim() || "Untitled",
            body,
            subcategory: subcategory.trim(),
            entry_date: entryDate,
            tags,
          };
          saved = await updateEntry(id, patch);
        } else {
          const payload: JournalEntryCreate = {
            category,
            subcategory: subcategory.trim(),
            title: title.trim() || "Untitled",
            body,
            entry_date: entryDate,
            tags,
          };
          saved = await createEntry(payload);
          idRef.current = saved.id;
          setCurrentId(saved.id);
        }
        if (editsRef.current === edits) dirtyRef.current = false;
        succeeded = true;
        setStatus("saved");
        onSaved(saved, id === null, closing);
      } catch (err) {
        console.error(err);
        setStatus("error");
      } finally {
        inFlightRef.current = false;
      }
      // Typing during the request was skipped by the guard above: save it on the usual delay, or
      // now if the editor has closed meanwhile.
      if (succeeded && dirtyRef.current) {
        if (closingRef.current) void saveRef.current({ explicit: false });
        else scheduleSave();
      }
    },
    [canSave, title, body, subcategory, entryDate, tags, category, onSaved, scheduleSave],
  );

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  function markDirty() {
    dirtyRef.current = true;
    editsRef.current += 1;
    setStatus("idle");
    scheduleSave();
  }

  // Flush a pending save on unmount only: a cleanup tied to `save` would run on every keystroke.
  useEffect(() => {
    // StrictMode runs this cleanup once on mount, then the effect again.
    closingRef.current = false;
    return () => {
      closingRef.current = true;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (dirtyRef.current && !inFlightRef.current) void saveRef.current({ explicit: false });
    };
  }, []);

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
      <div className="flex items-center gap-2 border-b border-border px-2 py-0.5 sm:px-4 sm:py-3">
        <button
          onClick={onBack}
          aria-label="Back to list"
          title="Back"
          className={cn(ICON_BUTTON, "text-muted hover:bg-surface hover:text-ink")}
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
          className="min-h-11 min-w-0 flex-1 bg-transparent text-lg font-medium text-ink outline-none placeholder:text-muted sm:min-h-0"
        />
        <span className="shrink-0 text-xs text-muted" aria-live="polite">
          {status === "saving" ? "saving…" : status === "saved" ? "saved" : status === "error" ? "error" : ""}
        </span>
        {currentId && (
          <button
            onClick={handleDelete}
            aria-label="Delete entry"
            title="Delete entry"
            className={cn(ICON_BUTTON, "text-muted hover:bg-destructive/10 hover:text-destructive")}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-border px-2 py-0.5 sm:px-4 sm:py-2">
        <select
          value={subOptions.includes(subcategory) ? subcategory : ""}
          onChange={(e) => handleSubChange(e.target.value)}
          onBlur={() => dirtyRef.current && save({ explicit: false })}
          className="min-h-11 rounded-md border border-border bg-bg px-2 py-1 text-sm text-ink sm:min-h-0 outline-none focus-visible:border-primary"
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
            ICON_BUTTON,
            "disabled:opacity-40",
            isDefault ? "text-accent" : "text-muted hover:text-ink"
          )}
        >
          <Star className="size-4" fill={isDefault ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        <button
          onClick={() => setShowMeta((v) => !v)}
          aria-expanded={showMeta}
          className="ml-auto min-h-11 rounded-md px-3 py-1 text-xs text-muted transition-colors hover:text-ink sm:min-h-0 sm:px-2"
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
              className="min-h-11 rounded-md border border-border bg-bg px-2 py-1 text-ink sm:min-h-0 outline-none focus-visible:border-primary"
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
              className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-ink sm:min-h-0 outline-none placeholder:text-muted focus-visible:border-primary"
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

      <div className="flex items-center justify-end border-t border-border px-4 py-2 sm:py-3">
        <button
          onClick={handleExplicitSave}
          disabled={!canSave || status === "saving"}
          className="min-h-11 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-bg transition-opacity disabled:opacity-40 sm:min-h-0 sm:px-3"
        >
          {status === "saving" ? "saving…" : "save & close"}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function JournalPage() {
  const readRef = useNavStore((s) => s.read.library);
  const selectedId = readRef?.kind === "journal" ? readRef.id : null;
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
  // An entry opened from Recent or the palette that the loaded page does not hold.
  const [fetched, setFetched] = useState<JournalEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  // A new entry's editor keeps this key after its first save gives it an id, so it is not remounted.
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [defaultSub, setDefaultSub] = useState<string>(() => getDefaultSubcategory(ACTIVE_CATEGORY));
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  // The id a new entry's first save opened, so that open keeps its editor.
  const adoptedId = useRef<string | null>(null);

  const listed = selectedId ? entries.find((e) => e.id === selectedId) : undefined;
  const selected = listed ?? (fetched && fetched.id === selectedId ? fetched : null);
  const isListed = listed !== undefined;

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

  // Opening an entry from anywhere (a row, Recent, the palette) shows it in the reader, except the
  // open a new entry's own first save makes.
  useEffect(() => {
    if (!selectedId) return;
    if (adoptedId.current === selectedId) {
      adoptedId.current = null;
      return;
    }
    setCreating(false);
    setEditing(false);
    setDraftKey(null);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || loading || isListed || fetched?.id === selectedId) return;
    let live = true;
    getEntry(selectedId)
      .then((entry) => live && setFetched(entry))
      .catch((err) => {
        if (!live) return;
        setError(`Couldn't open that entry: ${String(err)}`);
        useNavStore.getState().closeItem("journal");
      });
    return () => {
      live = false;
    };
  }, [selectedId, loading, isListed, fetched]);

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
    setDraftKey(`new-${Date.now()}`);
    setCreating(true);
    setEditing(true);
    useNavStore.getState().closeItem("journal");
  }

  function openEntry(id: string) {
    setCreating(false);
    setEditing(false);
    setDraftKey(null);
    useNavStore.getState().openItem({ kind: "journal", id });
  }

  function handleBack() {
    setCreating(false);
    setEditing(false);
    setDraftKey(null);
    useNavStore.getState().closeItem("journal");
  }

  function handleSaved(saved: JournalEntry, wasNew: boolean, closing: boolean) {
    setEntries((prev) => {
      if (wasNew) return [saved, ...prev];
      return prev.map((e) => (e.id === saved.id ? saved : e));
    });
    setFetched((prev) => (prev?.id === saved.id ? saved : prev));
    if (saved.subcategory && !subcategories.includes(saved.subcategory)) {
      setSubcategories((prev) => [...prev, saved.subcategory].sort());
    }

    if (closing) {
      // The editor is gone; flash the row briefly so it's obvious where the entry landed.
      setLastSavedId(saved.id);
      window.setTimeout(() => {
        setLastSavedId((id) => (id === saved.id ? null : id));
      }, SAVED_FLASH_MS);
      return;
    }

    // Autosave of a new entry: keep the user in its editor, now as that entry.
    if (wasNew) {
      adoptedId.current = saved.id;
      setCreating(false);
      setEditing(true);
      useNavStore.getState().openItem({ kind: "journal", id: saved.id });
    }
  }

  function handleDeleted(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    handleBack();
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
  const view = creating || (selected && editing) ? "editor" : selectedId ? "reader" : "list";
  const editorKey = draftKey ?? selected?.id ?? "none";
  const subChoices = [{ id: ALL_SUBS, label: "All" }, ...subcategories.map((s) => ({ id: s, label: s }))];

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="px-4 pt-3 sm:px-8">
        <ToolsRow
          picker={
            subcategories.length > 0 && (
              <ViewPicker
                title="Subcategory"
                choices={subChoices}
                value={subFilter ?? ALL_SUBS}
                onChange={(id) => setSubFilter(id === ALL_SUBS ? null : id)}
              />
            )
          }
          action={{ label: "New entry", onClick: handleNew }}
        />
      </div>
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden bg-bg min-[900px]:grid-cols-[340px_1fr]">
        {/* Phones keep the list under the full-screen reader, so Back finds it where it was. From
            640px the reader sits in the page, so below two panes it replaces the list. */}
        <aside
          className={cn(
            "relative min-h-0 flex-col overflow-hidden border-r border-border min-[900px]:flex",
            view === "list" ? "flex" : view === "reader" ? "hidden max-sm:flex" : "hidden"
          )}
        >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <input
            id="journal-search"
            type="search"
            placeholder="Search entries…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary sm:min-h-0"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {loading && <p className="px-2 py-1 text-sm text-muted">Loading…</p>}
          {error && <p className="px-2 py-1 text-sm text-destructive">{error}</p>}

          {!loading && !error && entries.length === 0 && (
            <p className="px-2 py-1 text-sm text-muted">
              {q ? `No entries match "${q}".` : "No entries yet. Tap New entry to start logging."}
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
                      onClick={() => openEntry(entry.id)}
                      aria-current={selectedId === entry.id ? "true" : undefined}
                      className={cn(
                        "relative flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface",
                        selectedId === entry.id && "bg-surface",
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
                  className="min-h-11 w-full rounded-md px-2 py-1.5 text-xs text-muted transition-colors hover:text-ink disabled:opacity-50 sm:min-h-0"
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
            view === "editor" ? "flex" : view === "reader" ? "hidden sm:flex" : "hidden"
          )}
        >
        {view === "editor" ? (
          <Editor
            key={editorKey}
            entry={creating ? null : selected}
            category={category}
            subcategories={editorSubOptions}
            defaultSubcategory={defaultSub}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onBack={handleBack}
            onPinDefault={handlePinDefault}
          />
        ) : view === "reader" ? (
          // Below 640px the Reader is a full-screen layer of its own; from there it needs this
          // scroller and gutter.
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8">
            {selected ? (
              <Reader
                back="Journal"
                context="Library › Journal"
                onBack={handleBack}
                actions={
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-3 text-sm text-ink transition-colors hover:bg-raised sm:min-h-8"
                  >
                    Edit
                  </button>
                }
              >
                <div className="flex flex-col gap-3">
                  <p className="text-caption text-muted">
                    {fmtDateLabel(selected.entry_date)} · {selected.subcategory}
                  </p>
                  <h2 className="text-title font-semibold text-ink">{selected.title}</h2>
                  <div className="prose-journal">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.body}</ReactMarkdown>
                  </div>
                </div>
              </Reader>
            ) : (
              <p className="text-sm text-muted">Loading…</p>
            )}
          </div>
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
    </div>
  );
}
