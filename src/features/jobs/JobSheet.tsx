import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import {
  ACTIVE_STATUSES,
  CONTINUABLE_STATUSES,
  approveJob,
  cancelJob,
  continueJob,
  getJob,
  type JobDetail,
} from "@/api/jobs";
import { errorText } from "@/api/homelab";
import { KIND_LABEL, STATUS_LABEL, duration, requesterLabel, statusTone, stepsFromEvents } from "./format";

interface Props {
  jobId: string | null;
  onClose: () => void;
  onChanged: () => void;
  onOpenJob: (id: string) => void;
}

const followField =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary";

export function JobSheet({ jobId, onClose, onChanged, onOpenJob }: Props) {
  const isMobile = useIsMobile();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [followUp, setFollowUp] = useState("");

  const load = useCallback(async () => {
    if (!jobId) return;
    try {
      setJob(await getJob(jobId));
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, [jobId]);

  useEffect(() => {
    setJob(null);
    setShowPrompt(false);
    load();
  }, [load]);

  // Follow a running job live.
  useEffect(() => {
    if (!job || !ACTIVE_STATUSES.includes(job.status)) return;
    const id = setTimeout(load, 3000);
    return () => clearTimeout(id);
  }, [job, load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await load();
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function sendFollowUp() {
    if (!jobId) return;
    setBusy(true);
    try {
      const child = await continueJob(jobId, followUp.trim());
      setFollowUp("");
      onChanged();
      onOpenJob(child.id);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const steps = stepsFromEvents(job?.events);
  const facts = job
    ? [
        KIND_LABEL[job.kind] ?? job.kind,
        job.model,
        requesterLabel(job.requested_by),
        duration(job.started_at, job.finished_at),
      ].filter(Boolean)
    : [];

  return (
    <Sheet open={jobId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={isMobile ? "bottom" : "right"} className={cn("gap-0", isMobile ? "max-h-[90dvh]" : "w-full sm:max-w-xl")}>
        <SheetHeader className="border-b border-border">
          <SheetTitle className="pr-8 text-base">{job?.title ?? "Job"}</SheetTitle>
          {job && (
            <p className="text-xs text-muted">
              <span className={cn(statusTone(job.status), job.status === "succeeded" && "text-ink")}>
                {STATUS_LABEL[job.status]}
              </span>
              {" · "}
              {facts.join(" · ")}
            </p>
          )}
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!job && !error && <p className="text-sm text-muted">Loading…</p>}

          {job && ACTIVE_STATUSES.includes(job.status) && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {job.status === "queued"
                  ? "Waiting for the worker…"
                  : job.status === "needs_approval"
                    ? "Waiting for your approval."
                    : job.status === "needs_input"
                      ? "Waiting for your answer."
                      : `Working: ${steps.length} steps so far…`}
              </p>
              <div className="flex gap-2">
                {job.status === "needs_approval" && (
                  <Button size="sm" disabled={busy} onClick={() => act(() => approveJob(job.id))}>
                    Approve
                  </Button>
                )}
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => cancelJob(job.id))}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {job?.status === "needs_input" && job.question && (
            <section aria-label="Question" className="rounded-md border border-border px-3 py-2">
              <h3 className="text-sm font-medium text-ink">It asks</h3>
              <p className="text-sm">{job.question}</p>
            </section>
          )}

          {job?.result && (
            <section aria-label="Result" className="prose-journal text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.result}</ReactMarkdown>
            </section>
          )}
          {job?.error && <p className="text-sm text-destructive">{job.error}</p>}

          {job?.meta?.pr_url && (
            <a
              href={job.meta.pr_url}
              target="_blank"
              rel="noreferrer"
              className="self-start rounded-md border border-border px-3 py-1.5 text-sm text-primary hover:bg-surface"
            >
              Open pull request #{job.meta.pr_number} on GitHub
            </a>
          )}
          {job?.meta?.pr_url && (
            <p className={cn("text-xs", job.meta.ci_state === "failure" ? "text-destructive" : "text-muted")}>
              {job.meta.ci_state === "success"
                ? "CI passed."
                : job.meta.ci_state === "failure"
                  ? "CI is still failing after the automatic fix attempts; it needs you."
                  : job.meta.ci_state === "fixing"
                    ? "CI failed; a fix-up job is working on the same PR."
                    : job.meta.ci_state === "no_ci"
                      ? "This repo has no CI on pull requests."
                      : "Waiting for CI…"}
              {job.meta.ci_fix_job && (
                <>
                  {" "}
                  <button type="button" className="text-primary hover:underline" onClick={() => onOpenJob(job.meta.ci_fix_job!)}>
                    Open the fix-up
                  </button>
                </>
              )}
            </p>
          )}
          {job?.meta?.changed_files && job.meta.changed_files.length > 0 && (
            <p className="text-xs text-muted">Changed: {job.meta.changed_files.join(", ")}</p>
          )}

          {job && CONTINUABLE_STATUSES.includes(job.status) && (
            <section aria-label="Follow up" className="flex flex-col gap-2">
              <textarea
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                rows={2}
                aria-label="Follow-up instruction"
                placeholder={
                  job.status === "needs_input"
                    ? "Your answer: the same agent continues where it stopped"
                    : job.status === "succeeded"
                      ? "Follow up: the same agent continues with its context"
                      : "Redirect: new directions; the same agent resumes where it was stopped"
                }
                className={cn(followField, "resize-y")}
              />
              <Button size="sm" className="self-end" disabled={busy || followUp.trim().length < 2} onClick={sendFollowUp}>
                {job.status === "needs_input" ? "Answer" : job.status === "succeeded" ? "Continue" : "Redirect"}
              </Button>
            </section>
          )}

          {steps.length > 0 && (
            <section aria-label="Steps" className="flex flex-col gap-1">
              <h3 className="text-sm font-medium text-ink">What it did ({steps.length} steps)</h3>
              <ol className="flex flex-col gap-1">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span className="w-16 shrink-0 text-muted">{s.label}</span>
                    <span className="min-w-0 break-words text-ink">{s.detail}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {job && (
            <section className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setShowPrompt((v) => !v)}
                className="self-start text-xs text-primary hover:underline"
              >
                {showPrompt ? "Hide the prompt" : "Show the prompt sent to the agent"}
              </button>
              {showPrompt && (
                <pre className="overflow-auto rounded-md border border-border bg-surface p-3 font-sans text-xs whitespace-pre-wrap text-ink">
                  {job.prompt}
                </pre>
              )}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
