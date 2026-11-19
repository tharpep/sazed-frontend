import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { DetailPanel } from "@/components/shell/DetailPanel";
import { cn } from "@/lib/utils";
import {
  ACTIVE_STATUSES,
  CONTINUABLE_STATUSES,
  approveJob,
  cancelJob,
  continueJob,
  getJob,
  resumeJob,
  type JobDetail,
} from "@/api/jobs";
import { errorText } from "@/api/homelab";
import { jobCardId } from "@/api/command";
import { CardActions, TOUCH_BUTTON } from "@/features/home/CardActions";
import { ageSince, heardLabel, isStale } from "@/features/home/heard";
import { Timeline } from "./Timeline";
import { KIND_LABEL, PAUSE_REASON, STATUS_LABEL, duration, requesterLabel, statusTone, stepsFromEvents } from "./format";

interface Props {
  jobId: string | null;
  onClose: () => void;
  onChanged: () => void;
  onOpenJob: (id: string) => void;
}

const FOOTER_BUTTON = "h-11 min-w-24 px-4 sm:h-8";

const followField =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary";

export function JobSheet({ jobId, onClose, onChanged, onOpenJob }: Props) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [followUp, setFollowUp] = useState("");
  // The job on screen now; a response or action started for another job must not land here.
  const shown = useRef(jobId);

  const load = useCallback(async () => {
    if (!jobId) return;
    try {
      const next = await getJob(jobId);
      if (shown.current !== jobId) return;
      setJob(next);
      setError(null);
    } catch (err) {
      if (shown.current === jobId) setError(errorText(err));
    }
  }, [jobId]);

  // On close the last job stays for the panel's exit animation.
  useEffect(() => {
    shown.current = jobId;
    if (!jobId) return;
    setJob(null);
    setError(null);
    setFollowUp("");
    setShowPrompt(false);
    load();
  }, [jobId, load]);

  // Follow a running job live.
  useEffect(() => {
    if (!job || !ACTIVE_STATUSES.includes(job.status)) return;
    const id = setTimeout(load, 3000);
    return () => clearTimeout(id);
  }, [job, load]);

  async function act(fn: () => Promise<unknown>) {
    const id = jobId;
    setBusy(true);
    try {
      await fn();
      await load();
      onChanged();
    } catch (err) {
      if (shown.current === id) setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function startChild(fn: (id: string) => Promise<JobDetail>) {
    const id = jobId;
    if (!id) return;
    setBusy(true);
    try {
      const child = await fn(id);
      onChanged();
      if (shown.current === id) onOpenJob(child.id);
    } catch (err) {
      if (shown.current === id) setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const resume = () => startChild(resumeJob);
  const sendFollowUp = () => startChild((id) => continueJob(id, followUp.trim()));

  const steps = stepsFromEvents(job?.events);
  const facts = job
    ? [
        KIND_LABEL[job.kind] ?? job.kind,
        job.model,
        requesterLabel(job.requested_by),
        duration(job.started_at, job.finished_at),
      ].filter(Boolean)
    : [];

  const active = !!job && ACTIVE_STATUSES.includes(job.status);
  const heardAge = ageSince(job?.heartbeat_at);
  const paused = job?.status === "paused";
  const footer =
    job && (active || paused) ? (
      <>
        {job.status === "needs_approval" && (
          <Button className={FOOTER_BUTTON} disabled={busy} onClick={() => act(() => approveJob(job.id))}>
            Approve
          </Button>
        )}
        {paused && (
          <Button className={FOOTER_BUTTON} disabled={busy} onClick={resume}>
            Resume
          </Button>
        )}
        <Button variant="outline" className={FOOTER_BUTTON} disabled={busy} onClick={() => act(() => cancelJob(job.id))}>
          Cancel
        </Button>
      </>
    ) : undefined;

  return (
    <DetailPanel
      open={jobId !== null}
      title={job?.title ?? "Job"}
      description={
        job && (
          <>
            <span className={cn(statusTone(job.status), job.status === "succeeded" && "text-ink")}>
              {STATUS_LABEL[job.status]}
            </span>
            {" · "}
            {facts.join(" · ")}
          </>
        )
      }
      onClose={onClose}
      footer={footer}
    >
      <div className="flex flex-col gap-5">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!job && !error && <p className="text-sm text-muted">Loading…</p>}

          {job && active && (
            <p className="text-sm text-muted">
              {job.status === "queued"
                ? "Waiting for the worker…"
                : job.status === "needs_approval"
                  ? "Waiting for your approval."
                  : job.status === "needs_input"
                    ? "Waiting for your answer."
                    : `Working: ${steps.length} steps so far…`}
              {job.status === "running" && (
                <span className={cn(isStale(heardAge, "job") && "text-warn")}> · {heardLabel(heardAge)}</span>
              )}
            </p>
          )}

          {job?.status === "running" && (
            <CardActions
              cardId={jobCardId(job.id)}
              actions={[{ id: "steer", label: "Steer", takes_text: true }]}
              touch
              onDone={() => {
                load();
                onChanged();
              }}
            />
          )}

          {job && paused && (
            <p className="text-sm text-muted">
              Paused: {PAUSE_REASON[job.meta.pause_reason ?? ""] ?? "it was stopped"}.{" "}
              {job.meta.pr_url ? "Its work so far is on the draft PR." : "It hadn't changed any files yet."}
            </p>
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
              className="inline-flex min-h-11 items-center self-start rounded-md border border-border px-3 py-1.5 text-sm text-primary hover:bg-surface sm:min-h-0"
            >
              Open {job.meta.pr_draft ? "draft " : ""}pull request #{job.meta.pr_number} on GitHub
            </a>
          )}
          {job?.meta?.pr_url && !job.meta.pr_draft && (
            <p className={cn("text-xs", job.meta.ci_state === "failure" ? "text-destructive" : "text-muted")}>
              {job.meta.ci_state === "success"
                ? "CI passed."
                : job.meta.ci_state === "failure"
                  ? "CI is still failing after the automatic fix attempts; it needs you."
                  : job.meta.ci_state === "fixing"
                    ? "CI failed; a fix-up job is working on the same PR."
                    : job.meta.ci_state === "no_ci"
                      ? "This repo has no CI on pull requests."
                      : job.meta.ci_state === "merged"
                        ? "The PR was merged."
                        : job.meta.ci_state === "closed"
                          ? "The PR was closed; no more CI checks or fix-ups."
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
              <Button size="sm" className={cn("self-end", TOUCH_BUTTON)} disabled={busy || followUp.trim().length < 2} onClick={sendFollowUp}>
                {job.status === "needs_input" ? "Answer" : job.status === "succeeded" ? "Continue" : "Redirect"}
              </Button>
            </section>
          )}

          {job?.timeline && job.timeline.length > 1 && (
            <Timeline steps={job.timeline} endAt={job.finished_at} live={job.status === "running"} />
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
                className="self-start text-xs text-primary hover:underline max-sm:min-h-11"
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
    </DetailPanel>
  );
}
