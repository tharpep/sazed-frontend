import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createBacklogItem, listBacklog, updateBacklogItem, type BacklogItem } from "@/api/backlog";
import { errorText } from "@/api/homelab";
import {
  addWorkstream,
  updateProject,
  updateWorkstream,
  type Project,
  type ProjectState,
  type Workstream,
} from "@/api/projects";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_TEXT } from "@/widgets/projectParts";

import { field } from "./fields";

const STATES: ProjectState[] = ["active", "paused", "done", "dropped"];
const MATCHES_SHOWN = 6;

interface Props {
  project: Project;
  onChanged: () => void;
  onDone: () => void;
}

function useRunner(onChanged: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

function Details({ project, onChanged }: { project: Project; onChanged: () => void }) {
  const [title, setTitle] = useState(project.title);
  const [summary, setSummary] = useState(project.summary);
  const [update, setUpdate] = useState(project.latest_update ?? "");
  const [state, setState] = useState<ProjectState>(project.state);
  const { busy, error, run } = useRunner(onChanged);
  const dirty =
    title !== project.title || summary !== project.summary || update !== (project.latest_update ?? "") || state !== project.state;

  function save() {
    const patch: Parameters<typeof updateProject>[1] = {};
    if (title !== project.title) patch.title = title.trim();
    if (summary !== project.summary) patch.summary = summary.trim();
    if (update !== (project.latest_update ?? "")) patch.latest_update = update.trim();
    if (state !== project.state) patch.state = state;
    run(() => updateProject(project.slug, patch));
  }

  return (
    <section aria-label="Project details" className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3 md:p-4">
      <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_10rem]">
        <label className="flex flex-col gap-1 text-caption text-muted">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-caption text-muted">
          State
          <select value={state} onChange={(e) => setState(e.target.value as ProjectState)} className={field}>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-caption text-muted">
        What it is
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className={cn(field, "resize-y")} />
      </label>
      <label className="flex flex-col gap-1 text-caption text-muted">
        Latest update
        <textarea value={update} onChange={(e) => setUpdate(e.target.value)} rows={2} className={cn(field, "resize-y")} />
      </label>
      {error && <p className="text-caption text-err">{error}</p>}
      <div className="flex justify-end">
        <Button size="sm" disabled={!dirty || busy || title.trim().length < 2} onClick={save}>
          Save details
        </Button>
      </div>
    </section>
  );
}

function FileFromBacklog({ step, unfiled, onChanged }: { step: Workstream; unfiled: BacklogItem[]; onChanged: () => void }) {
  const [query, setQuery] = useState("");
  const { busy, error, run } = useRunner(onChanged);
  const matches = query.trim()
    ? unfiled.filter((i) => i.title.toLowerCase().includes(query.trim().toLowerCase())).slice(0, MATCHES_SHOWN)
    : [];
  return (
    <div className="flex flex-col gap-1">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={`Find a backlog item for ${step.title}`}
        placeholder="File a backlog item: search its title"
        className={field}
      />
      {matches.map((i) => (
        <div key={i.id} className="flex items-center gap-2 pl-1 text-meta">
          <span className="min-w-0 flex-1 truncate text-ink">{i.title}</span>
          <Button
            size="xs"
            variant="outline"
            disabled={busy}
            onClick={async () => (await run(() => updateBacklogItem(i.id, { workstream_id: step.id }))) && setQuery("")}
          >
            File here
          </Button>
        </div>
      ))}
      {query.trim() && matches.length === 0 && <p className="pl-1 text-caption text-muted">No unfiled item matches.</p>}
      {error && <p className="text-caption text-err">{error}</p>}
    </div>
  );
}

interface StepProps {
  step: Workstream;
  index: number;
  count: number;
  unfiled: BacklogItem[];
  onMove: (from: number, to: number) => void;
  onChanged: () => void;
  moving: boolean;
}

function StepEditor({ step, index, count, unfiled, onMove, onChanged, moving }: StepProps) {
  const [title, setTitle] = useState(step.title);
  const [summary, setSummary] = useState(step.summary);
  const [newCard, setNewCard] = useState("");
  const { busy, error, run } = useRunner(onChanged);
  const closed = step.state !== "open";

  function saveText() {
    const patch: { title?: string; summary?: string } = {};
    if (title.trim() !== step.title && title.trim().length >= 2) patch.title = title.trim();
    if (summary.trim() !== step.summary) patch.summary = summary.trim();
    if (Object.keys(patch).length) run(() => updateWorkstream(step.id, patch));
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    if ((await run(() => createBacklogItem({ type: "planned", title: newCard.trim(), workstream_id: step.id })))) setNewCard("");
  }

  return (
    <li className={cn("flex flex-col gap-2 px-3 py-3 md:px-4", closed && "bg-bg")}>
      <div className="flex items-center gap-2">
        <span className="w-5 shrink-0 font-mono text-caption text-muted tabular-nums">{index + 1}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveText}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          aria-label="Step title"
          className={cn(field, "font-medium", closed && "text-ink-2")}
        />
        <span className={cn("hidden w-16 shrink-0 text-caption sm:inline", STATUS_TEXT[step.status])}>{STATUS_LABEL[step.status]}</span>
        <Button size="icon-sm" variant="ghost" aria-label="Move up" disabled={index === 0 || moving} onClick={() => onMove(index, index - 1)}>
          <ArrowUp />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Move down"
          disabled={index === count - 1 || moving}
          onClick={() => onMove(index, index + 1)}
        >
          <ArrowDown />
        </Button>
      </div>
      <div className="flex flex-col gap-2 pl-7">
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={saveText}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          aria-label="Step summary"
          placeholder="One line on what this step delivers"
          className={field}
        />
        <div className="flex flex-wrap gap-1.5">
          {closed ? (
            <Button size="xs" variant="outline" disabled={busy} onClick={() => run(() => updateWorkstream(step.id, { state: "open" }))}>
              Reopen
            </Button>
          ) : (
            <>
              <Button size="xs" variant="outline" disabled={busy} onClick={() => run(() => updateWorkstream(step.id, { state: "done" }))}>
                Mark done
              </Button>
              <Button
                size="xs"
                variant="ghost"
                className="text-err hover:text-err"
                disabled={busy}
                onClick={() => run(() => updateWorkstream(step.id, { state: "dropped" }))}
              >
                Drop
              </Button>
            </>
          )}
        </div>
        {(step.cards ?? []).length > 0 && (
          <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
            {(step.cards ?? []).map((c) => (
              <li key={c.id} className="flex items-center gap-2 px-2.5 py-1.5 text-meta">
                <span className={cn("min-w-0 flex-1 truncate", c.stage === "done" ? "text-ink-2" : "text-ink")}>{c.title}</span>
                <span className="shrink-0 text-caption text-muted">{c.next}</span>
                {c.kind === "item" && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Take ${c.title} off this step`}
                    disabled={busy}
                    onClick={() => run(() => updateBacklogItem(c.id.replace(/^item:/, ""), { workstream_id: null }))}
                  >
                    <X />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!closed && (
          <>
            <form onSubmit={addCard} className="flex gap-1.5">
              <input
                value={newCard}
                onChange={(e) => setNewCard(e.target.value)}
                aria-label={`New card for ${step.title}`}
                placeholder="Add a card: what needs doing"
                className={field}
              />
              <Button type="submit" size="sm" variant="outline" disabled={busy || newCard.trim().length < 3}>
                Add
              </Button>
            </form>
            <FileFromBacklog step={step} unfiled={unfiled} onChanged={onChanged} />
          </>
        )}
        {error && <p className="text-caption text-err">{error}</p>}
      </div>
    </li>
  );
}

function AddStep({ slug, onChanged }: { slug: string; onChanged: () => void }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const { busy, error, run } = useRunner(onChanged);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await run(() => addWorkstream(slug, { title: title.trim(), summary: summary.trim() }))) {
      setTitle("");
      setSummary("");
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg border border-dashed border-line p-3 md:p-4">
      <h3 className="text-meta font-semibold text-ink">Add a step</h3>
      <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="New step title" placeholder="Step title" className={field} />
      <input
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        aria-label="New step summary"
        placeholder="One line on what it delivers (optional)"
        className={field}
      />
      {error && <p className="text-caption text-err">{error}</p>}
      <Button type="submit" size="sm" className="self-end" disabled={busy || title.trim().length < 2}>
        Add step
      </Button>
    </form>
  );
}

export function ProjectEditor({ project, onChanged, onDone }: Props) {
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    listBacklog("open")
      .then(setBacklog)
      .catch(() => setBacklog([]));
  }, [project.workstreams]);

  const unfiled = useMemo(() => backlog.filter((i) => !i.workstream_id), [backlog]);
  const steps = project.workstreams;

  async function move(from: number, to: number) {
    const order = [...steps];
    const [picked] = order.splice(from, 1);
    order.splice(to, 0, picked);
    setMoving(true);
    setMoveError(null);
    try {
      await Promise.all(
        order.map((w, i) => (w.position === i + 1 ? null : updateWorkstream(w.id, { position: i + 1 }))).filter(Boolean)
      );
      onChanged();
    } catch (err) {
      setMoveError(errorText(err));
    } finally {
      setMoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">Editing {project.title}</h2>
        <Button size="sm" onClick={onDone}>
          Done editing
        </Button>
      </div>
      <Details project={project} onChanged={onChanged} />
      <section aria-label="Steps" className="flex flex-col gap-2">
        <h3 className="px-0.5 text-meta font-semibold text-ink">
          Steps <span className="font-normal text-muted">{steps.length}</span>
        </h3>
        {moveError && <p className="text-caption text-err">{moveError}</p>}
        {steps.length > 0 && (
          <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {steps.map((w, i) => (
              <StepEditor
                key={w.id}
                step={w}
                index={i}
                count={steps.length}
                unfiled={unfiled}
                onMove={move}
                onChanged={onChanged}
                moving={moving}
              />
            ))}
          </ol>
        )}
        <AddStep slug={project.slug} onChanged={onChanged} />
      </section>
    </div>
  );
}
