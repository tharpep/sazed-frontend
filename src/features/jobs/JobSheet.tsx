import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { ACTIVE_STATUSES, cancelJob, getJob, type JobDetail } from "@/api/jobs";
import { errorText } from "@/api/homelab";
import { KIND_LABEL, STATUS_LABEL, duration, requesterLabel, statusTone, stepsFromEvents } from "./format";

interface Props {
  jobId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function JobSheet({ jobId, onClose, onChanged }: Props) {
  const isMobile = useIsMobile();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

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

  async function cancel() {
    if (!jobId) return;
    setBusy(true);
    try {
      await cancelJob(jobId);
      await load();
      onChanged();
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
                {job.status === "queued" ? "Waiting for the worker…" : `Working: ${steps.length} steps so far…`}
              </p>
              <Button size="sm" variant="outline" disabled={busy} onClick={cancel}>
                Cancel
              </Button>
            </div>
          )}

          {job?.result && (
            <section aria-label="Result" className="prose-journal text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.result}</ReactMarkdown>
            </section>
          )}
          {job?.error && <p className="text-sm text-destructive">{job.error}</p>}

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
