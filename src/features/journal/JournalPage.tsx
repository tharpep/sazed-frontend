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
  subcategories: string[];
  defaultSubcategory: string;
  onSaved: (entry: JournalEntry, wasNew: boolean) => void;
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

  const canSave = subcategory.trim().length > 0 && (title.trim().length > 0 || body.trim().length > 0);

  const save = useCallback(async () => {
    if (!dirtyRef.current || !canSave) return;
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
        onSaved(updated, false);
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
        onSaved(created, true);
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [canSave, currentId, title, body, subcategory, entryDate, tags, category, onSaved]);

  function markDirty() {
    dirtyRef.current = true;
    setStatus("idle");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void save();
    }, AUTOSAVE_MS);
  }

  // Flush pending save on unmount.
  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (dirtyRef.current) void save();
    };
  }, [save]);

  // Keyboard: cmd/ctrl+enter saves.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  async function handleDelete() {
    if (!currentId) {
      onBack();
      return;
    }
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    await deleteEntry(currentId);
    onDeleted(currentId);
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
          onBlur={() => dirtyRef.current && save()}
        />
        <span className={styles.saveStatus} aria-live="polite">
          {status === "saving" ? "saving…" : status === "saved" ? "saved" : status === "error" ? "error" : ""}
        </span>
      </div>

      <div className={styles.editorSubrow}>
        <input
          className={styles.subcategoryInput}
          list="journal-subcategories"
          placeholder="subcategory"
          value={subcategory}
          onChange={(e) => {
            setSubcategory(e.target.value);
            markDirty();
          }}
          onBlur={() => dirtyRef.current && save()}
        />
        <datalist id="journal-subcategories">
          {subcategories.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
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
              onBlur={() => dirtyRef.current && save()}
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
              onBlur={() => dirtyRef.current && save()}
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
              if (dirtyRef.current) save();
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
        {currentId && (
          <button className={styles.deleteBtn} onClick={handleDelete}>
            delete
          </button>
        )}
        <span className={styles.footerSpacer} />
        <button className={styles.saveBtn} onClick={save} disabled={!canSave}>
          save
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

  function handleSaved(saved: JournalEntry, wasNew: boolean) {
    setEntries((prev) => {
      if (wasNew) return [saved, ...prev];
      return prev.map((e) => (e.id === saved.id ? saved : e));
    });
    if (saved.subcategory && !subcategories.includes(saved.subcategory)) {
      setSubcategories((prev) => [...prev, saved.subcategory].sort());
    }
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
                  {group.map((entry) => (
                    <button
                      key={entry.id}
                      className={`${styles.entryRow} ${selected?.id === entry.id ? styles.entryRowActive : ""}`}
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
                    </button>
                  ))}
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
            subcategories={subcategories}
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
