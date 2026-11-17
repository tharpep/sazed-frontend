import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { ACTIVE_STATUSES, listJobs, type JobSummary } from "@/api/jobs";
import { errorText } from "@/api/homelab";
import { useNavStore } from "@/store/navStore";
import { JobSheet } from "./JobSheet";
import { JobStartForm } from "./JobStartForm";
import { KIND_LABEL, STATUS_LABEL, duration, requesterLabel, statusTone } from "./format";

function openJob(id: string) {
  useNavStore.getState().openItem({ kind: "job", id });
}

function closeJob() {
  useNavStore.getState().closeItem("job");
}

interface Props {
  starting: boolean;
  onStartingChange: (starting: boolean) => void;
}

/** Worker jobs as Running, Failed and Done, the open job's sheet, and the start form's panel. */
export function JobsPanel({ starting, onStartingChange }: Props) {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navItem = useNavStore((s) => s.open.agents);
  const jobId = navItem?.kind === "job" ? navItem.id : null;
  const jobGroups: Array<[string, JobSummary[]]> = [
    ["Running", (jobs ?? []).filter((j) => ACTIVE_STATUSES.includes(j.status))],
    ["Failed", (jobs ?? []).filter((j) => ["failed", "timed_out", "paused"].includes(j.status))],
    ["Done", (jobs ?? []).filter((j) => ["succeeded", "cancelled"].includes(j.status))],
  ];

  // One panel at a time: a job opened from anywhere (a row, the palette, a follow-up) replaces
  // the start form.
  useEffect(() => {
    if (jobId) onStartingChange(false);
  }, [jobId, onStartingChange]);

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
  }, [load, anyActive]);

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-destructive">Couldn't load jobs: {error}</p>}
      {!jobs && !error && <p className="text-sm text-muted">Loading…</p>}
      {jobs && jobs.length === 0 && (
        <p className="px-1 text-sm text-muted">No jobs yet. Ask Sazed to research something, or start one here.</p>
      )}
      {jobGroups.map(([label, items]) =>
        items.length > 0 ? (
          <section key={label} aria-label={label} className="flex flex-col gap-2">
            <h3 className="px-1 text-sm font-medium text-ink">{label}</h3>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {items.map((j) => (
                <li key={j.id}>
                  <button
                    type="button"
                    onClick={() => openJob(j.id)}
                    aria-current={j.id === jobId ? "true" : undefined}
                    className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface aria-[current]:bg-surface"
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
          </section>
        ) : null
      )}

      <JobStartForm open={starting && !jobId} onClose={() => onStartingChange(false)} onChanged={load} onStarted={openJob} />
      <JobSheet jobId={jobId} onClose={closeJob} onChanged={load} onOpenJob={openJob} />
    </div>
  );
}
