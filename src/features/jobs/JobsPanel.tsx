import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ACTIVE_STATUSES,
  listJobs,
  startCodeTask,
  startResearch,
  startSecondOpinion,
  type JobSummary,
} from "@/api/jobs";
import { errorText } from "@/api/homelab";
import { JobSheet } from "./JobSheet";
import { KIND_LABEL, STATUS_LABEL, duration, requesterLabel, statusTone } from "./format";

const field =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary";

type Mode = "research" | "second_opinion" | "code_review";

export function JobsPanel({ refreshKey }: { refreshKey: number }) {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("research");
  const [text, setText] = useState("");
  const [repo, setRepo] = useState("");
  const [deep, setDeep] = useState(false);
  const [saveToKb, setSaveToKb] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      setJobs(await listJobs());
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  // Faster refresh while something is queued or running.
  const anyActive = (jobs ?? []).some((j) => ACTIVE_STATUSES.includes(j.status));
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, anyActive ? 5_000 : 30_000);
    return () => clearInterval(id);
  }, [load, anyActive, refreshKey]);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const job =
        mode === "research"
          ? await startResearch(text.trim(), deep ? "deep" : "quick", saveToKb)
          : mode === "code_review"
            ? await startCodeTask(repo.trim(), text.trim())
            : await startSecondOpinion(text.trim());
      setText("");
      setMessage({ text: "Started. It shows below; tap it to follow along.", error: false });
      await load();
      setOpen(job.id);
    } catch (err) {
      setMessage({ text: errorText(err), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Start a job" className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <div role="tablist" aria-label="Job type" className="flex gap-1 rounded-md bg-surface p-0.5">
          {([["research", "Research"], ["second_opinion", "Second opinion"], ["code_review", "Code review"]] as const).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 rounded px-2 py-1.5 text-sm transition-colors",
                mode === m ? "bg-bg text-ink shadow-sm" : "text-muted hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "code_review" && (
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            aria-label="Repository"
            placeholder="Repo, e.g. sazed or tharpep/sazed-worker"
            className={field}
          />
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={mode === "research" ? 3 : 5}
          aria-label={mode === "research" ? "Question" : "What to review"}
          placeholder={
            mode === "research"
              ? "What do you want researched?"
              : mode === "code_review"
                ? "What should Claude Code look at? e.g. review the error handling in the job runner"
                : "Paste the plan, decision or answer you want a second opinion on"
          }
          className={cn(field, "resize-y")}
        />
        {mode === "research" && (
          <div className="flex flex-col gap-2 text-sm text-ink">
            <label className="flex items-center justify-between gap-3">
              Deep (several minutes, full report)
              <Switch aria-label="Deep research" checked={deep} onCheckedChange={setDeep} />
            </label>
            <label className="flex items-center justify-between gap-3">
              Save to knowledge base
              <Switch aria-label="Save to knowledge base" checked={saveToKb} onCheckedChange={setSaveToKb} />
            </label>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {mode === "code_review"
              ? "Claude Code (Sonnet 5.5), read-only, public repos"
              : "Gemini 3.8 Flash (High) on the worker"}
          </p>
          <Button
            size="sm"
            disabled={busy || text.trim().length < 3 || (mode === "code_review" && !repo.trim())}
            onClick={submit}
          >
            {busy ? "Starting…" : "Start"}
          </Button>
        </div>
        {message && (
          <p role="status" className={cn("text-sm", message.error ? "text-destructive" : "text-muted")}>
            {message.text}
          </p>
        )}
      </section>

      <section aria-label="Jobs" className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-ink">Recent jobs</h2>
        {error && <p className="text-sm text-destructive">Couldn't load jobs: {error}</p>}
        {!jobs && !error && <p className="text-sm text-muted">Loading…</p>}
        {jobs && jobs.length === 0 && (
          <p className="px-1 text-sm text-muted">No jobs yet. Ask Sazed to research something, or start one above.</p>
        )}
        {jobs && jobs.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {jobs.map((j) => (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => setOpen(j.id)}
                  className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm text-ink">{j.title}</span>
                    <span className="truncate text-xs text-muted">
                      <span className={cn(statusTone(j.status))}>{STATUS_LABEL[j.status]}</span>
                      {" · "}
                      {[KIND_LABEL[j.kind] ?? j.kind, requesterLabel(j.requested_by), duration(j.started_at, j.finished_at)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <JobSheet jobId={open} onClose={() => setOpen(null)} onChanged={load} onOpenJob={setOpen} />
    </div>
  );
}
