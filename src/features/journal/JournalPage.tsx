import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createEntry,
  deleteEntry,
  listEntries,
  listSubcategories,
  updateEntry,
} from "../../api/journal";
import type {
  EntryPage,
  JournalCategory,
  JournalEntry,
  JournalEntryCreate,
  JournalEntryUpdate,
} from "../../api/journal";
import styles from "./JournalPage.module.css";

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
    <div className={styles.editor}>
      <div className={styles.editorHeader}>
        <button
          className={styles.iconBtn}
          onClick={onBack}
          aria-label="Back to list"
          title="Back"
        >
          ←
        </button>
        <input
          ref={titleRef}
          className={styles.titleInput}
          placeholder="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
          }}
          onBlur={() => dirtyRef.current && save({ explicit: false })}
        />
        <span className={styles.saveStatus} aria-live="polite">
          {status === "saving" ? "saving…" : status === "saved" ? "saved" : status === "error" ? "error" : ""}
        </span>
        {currentId && (
          <button
            className={styles.trashBtn}
            onClick={handleDelete}
            aria-label="Delete entry"
            title="Delete entry"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 5h12" />
              <path d="M7 5V3h4v2" />
              <path d="M6 5l.75 10h6.5L14 5" />
            </svg>
          </button>
        )}
      </div>

      <div className={styles.editorSubrow}>
        <select
          className={styles.subcategorySelect}
          value={subOptions.includes(subcategory) ? subcategory : ""}
          onChange={(e) => handleSubChange(e.target.value)}
          onBlur={() => dirtyRef.current && save({ explicit: false })}
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
          className={`${styles.pinBtn} ${isDefault ? styles.pinBtnActive : ""}`}
          onClick={() => onPinDefault(isDefault ? "" : subcategory.trim())}
          disabled={!subcategory.trim()}
          title={isDefault ? "Default for this category" : "Set as default for this category"}
          aria-pressed={isDefault}
        >
          {isDefault ? "★" : "☆"}
        </button>
        <button
          className={styles.metaToggle}
          onClick={() => setShowMeta((v) => !v)}
          aria-expanded={showMeta}
        >
          {showMeta ? "less" : "more"}
        </button>
      </div>

      {showMeta && (
        <div className={styles.metaPanel}>
          <label className={styles.metaRow}>
            <span className={styles.metaLabel}>date</span>
            <input
              type="date"
              className={styles.metaInput}
              value={entryDate}
              onChange={(e) => {
                setEntryDate(e.target.value);
                markDirty();
              }}
              onBlur={() => dirtyRef.current && save({ explicit: false })}
            />
          </label>
          <label className={styles.metaRow}>
            <span className={styles.metaLabel}>tags</span>
            <input
              className={styles.metaInput}
              placeholder="comma-separated"
              value={tagsStr}
              onChange={(e) => {
                setTagsStr(e.target.value);
                markDirty();
              }}
              onBlur={() => dirtyRef.current && save({ explicit: false })}
            />
          </label>
        </div>
      )}

      <div className={styles.editorBody}>
        {editingBody ? (
          <textarea
            className={styles.bodyTextarea}
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
          />
        ) : (
          <div
            className={styles.bodyRendered}
            onClick={() => setEditingBody(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditingBody(true);
            }}
          >
            {body.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            ) : (
              <span className={styles.bodyPlaceholder}>
                Tap to start writing. Markdown supported.
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.editorFooter}>
        <span className={styles.footerSpacer} />
        <button
          className={styles.saveBtn}
          onClick={handleExplicitSave}
          disabled={!canSave || status === "saving"}
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
    <div className={styles.page} data-view={view}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <input
            id="journal-search"
            className={styles.searchInput}
            type="search"
            placeholder="Search entries…"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
          />
        </div>

        {subcategories.length > 0 && (
          <div className={styles.chipRow}>
            <button
              className={`${styles.chip} ${subFilter === null ? styles.chipActive : ""}`}
              onClick={() => setSubFilter(null)}
            >
              all
            </button>
            {subcategories.map((s) => (
              <button
                key={s}
                className={`${styles.chip} ${subFilter === s ? styles.chipActive : ""}`}
                onClick={() => setSubFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className={styles.listScroll}>
          {loading && <p className={styles.state}>Loading…</p>}
          {error && <p className={styles.stateError}>{error}</p>}

          {!loading && !error && entries.length === 0 && (
            <p className={styles.empty}>
              {q ? `No entries match "${q}".` : "No entries yet. Tap + to start logging."}
            </p>
          )}

          {!loading && entries.length > 0 && (
            <>
              {grouped.map(([date, group]) => (
                <div key={date}>
                  <div className={styles.dateGroup}>{fmtDateLabel(date)}</div>
                  {group.map((entry) => {
                    const classes = [
                      styles.entryRow,
                      selected?.id === entry.id ? styles.entryRowActive : "",
                      lastSavedId === entry.id ? styles.entryRowFlash : "",
                    ].filter(Boolean).join(" ");
                    return (
                      <button
                        key={entry.id}
                        className={classes}
                        onClick={() => {
                          setCreating(false);
                          setSelected(entry);
                        }}
                      >
                        <span className={styles.entryTitle}>{entry.title}</span>
                        <span className={styles.entryMeta}>
                          <span className={styles.entrySub}>{entry.subcategory}</span>
                          {entry.tags.slice(0, 2).map((t) => (
                            <span key={t} className={styles.tag}>{t}</span>
                          ))}
                        </span>
                        {lastSavedId === entry.id && (
                          <span className={styles.savedBadge} aria-hidden>
                            saved ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
              {nextCursor && (
                <button
                  className={styles.loadMoreBtn}
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "loading…" : "load more"}
                </button>
              )}
            </>
          )}
        </div>

        <button
          className={styles.fab}
          onClick={handleNew}
          aria-label="New entry"
          title="New entry (n)"
        >
          +
        </button>
      </aside>

      <main className={styles.main}>
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
          <div className={styles.placeholder}>
            <p className={styles.placeholderTitle}>Select an entry</p>
            <p className={styles.placeholderHint}>or press <kbd>n</kbd> for a new entry</p>
          </div>
        )}
      </main>
    </div>
  );
}
