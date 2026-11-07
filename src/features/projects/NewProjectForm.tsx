import { useState } from "react";

import { errorText } from "@/api/homelab";
import { createProject, type Project } from "@/api/projects";
import { Button } from "@/components/ui/button";

import { field, slugify } from "./fields";

interface Props {
  onCreated: (project: Project) => void;
  onCancel: () => void;
}

export function NewProjectForm({ onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownSlug = slugTouched ? slug : slugify(title);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onCreated(await createProject({ slug: shownSlug, title: title.trim(), summary: summary.trim() }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3 md:p-4">
      <h2 className="text-meta font-semibold text-ink">New project</h2>
      <div className="grid gap-2.5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label className="flex flex-col gap-1 text-caption text-muted">
          Title
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="Garden irrigation" />
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted">
          Short name
          <input
            value={shownSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={`${field} font-mono`}
            placeholder="garden-irrigation"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-caption text-muted">
        What it is
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className={`${field} resize-y`} />
      </label>
      {error && <p className="text-caption text-err">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy || title.trim().length < 2 || shownSlug.length < 2}>
          Create project
        </Button>
      </div>
    </form>
  );
}
