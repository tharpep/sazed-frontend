import { useEffect, useState } from "react";
import type { JournalEntry, JournalEntryCreate, JournalEntryUpdate } from "../../api/journal";
import {
  listEntries,
  listProjects,
  createEntry,
  updateEntry,
  deleteEntry,
} from "../../api/journal";
import styles from "./JournalPage.module.css";

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function groupByDate(entries: JournalEntry[]): Map<string, JournalEntry[]> {
  const map = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const group = map.get(e.entry_date) ?? [];
    group.push(e);
    map.set(e.entry_date, group);
  }
  return map;
}

// ── Entry Form ────────────────────────────────────────────────────────────

function EntryForm({
  initial,
  projects,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: JournalEntry;
  projects: string[];
  onSave: (data: JournalEntryCreate | JournalEntryUpdate) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [project, setProject] = useState(initial?.project ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [entryDate, setEntryDate] = useState(initial?.entry_date ?? todayISO());
  const [tagsStr, setTagsStr] = useState((initial?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!project || !title || !body) return;
    setSaving(true);
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      await onSave({ project, title, body, entry_date: entryDate, tags });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.formPanel}>
      <div className={styles.formRow}>
        <span className={styles.formLabel}>date</span>
        <input
          className={styles.formInput}
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
        />
      </div>
      <div className={styles.formRow}>
        <span className={styles.formLabel}>project</span>
        <input
          className={styles.formInput}
          list="journal-projects"
          placeholder="project or company"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        />
        <datalist id="journal-projects">
          {projects.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>
      <div className={styles.formRow}>
        <span className={styles.formLabel}>title</span>
        <input
          className={styles.formInput}
          placeholder="short summary"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className={styles.formRow}>
        <span className={styles.formLabel}>body</span>
        <textarea
          className={styles.formTextarea}
          placeholder="what did you do today?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className={styles.formRow}>
        <span className={styles.formLabel}>tags</span>
        <input
          className={styles.formInput}
          placeholder="comma-separated, e.g. backend, bugfix"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
        />
      </div>
      <div className={styles.formActions}>
        {onDelete && (
          <button className={styles.deleteBtn} onClick={onDelete}>
            delete
          </button>
        )}
        <button className={styles.cancelBtn} onClick={onCancel}>
          cancel
        </button>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "saving..." : "save"}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [filterProject, setFilterProject] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const [creating, setCreating] = useState(false);

  async function load(project?: string) {
    try {
      const params = project ? { project } : undefined;
      const [e, p] = await Promise.all([listEntries(params), listProjects()]);
      setEntries(e);
      setProjects(p);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filterProject || undefined);
  }, [filterProject]);

  function handleFilterChange(val: string) {
    setFilterProject(val);
    setSelected(null);
    setCreating(false);
  }

  async function handleCreate(data: JournalEntryCreate | JournalEntryUpdate) {
    const created = await createEntry(data as JournalEntryCreate);
    setEntries((prev) => [created, ...prev]);
    if (created.project && !projects.includes(created.project)) {
      setProjects((prev) => [...prev, created.project].sort());
    }
    setCreating(false);
    setSelected(created);
  }

  async function handleUpdate(data: JournalEntryCreate | JournalEntryUpdate) {
    if (!selected) return;
    const updated = await updateEntry(selected.id, data as JournalEntryUpdate);
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setSelected(updated);
  }

  async function handleDelete() {
    if (!selected) return;
    await deleteEntry(selected.id);
    setEntries((prev) => prev.filter((e) => e.id !== selected.id));
    setSelected(null);
  }

  const grouped = groupByDate(entries);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <select
          className={styles.filterSelect}
          value={filterProject}
          onChange={(e) => handleFilterChange(e.target.value)}
        >
          <option value="">all projects</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          className={styles.newBtn}
          onClick={() => {
            setSelected(null);
            setCreating(true);
          }}
        >
          + new entry
        </button>
      </div>

      {creating && (
        <EntryForm
          projects={projects}
          onSave={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {selected && !creating && (
        <EntryForm
          key={selected.id}
          initial={selected}
          projects={projects}
          onSave={handleUpdate}
          onCancel={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}

      {loading && <p className={styles.state}>Loading...</p>}
      {error && <p className={styles.stateError}>{error}</p>}

      {!loading && !error && entries.length === 0 && !creating && (
        <p className={styles.empty}>No journal entries yet. Click "+ new entry" to start logging.</p>
      )}

      {!loading && entries.length > 0 && (
        <div className={styles.entryList}>
          {[...grouped.entries()].map(([date, group]) => (
            <div key={date}>
              <div className={styles.dateGroup}>{fmtDate(date)}</div>
              {group.map((entry) => (
                <div
                  key={entry.id}
                  className={`${styles.entryRow} ${selected?.id === entry.id ? styles.entryRowActive : ""}`}
                  onClick={() => {
                    setCreating(false);
                    setSelected(entry);
                  }}
                >
                  <span className={styles.entryProject}>{entry.project}</span>
                  <span className={styles.entryTitle}>{entry.title}</span>
                  <span className={styles.entryTags}>
                    {entry.tags.slice(0, 3).map((t) => (
                      <span key={t} className={styles.tag}>
                        {t}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
