import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACTIVE_STATUSES, listJobs, type JobSummary } from "@/api/jobs";
import { errorText } from "@/api/homelab";
import { DetailPanel } from "@/components/shell/DetailPanel";
import { JobSheet } from "./JobSheet";
import { JobStartForm } from "./JobStartForm";
import { KIND_LABEL, STATUS_LABEL, duration, requesterLabel, statusTone } from "./format";

export function JobsPanel({ refreshKey, grouped = false, startInPanel = false }: { refreshKey: number; grouped?: boolean; startInPanel?: boolean }) {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const jobGroups: Array<[string, JobSummary[]]> = grouped
    ? [
        ["Running", (jobs ?? []).filter((j) => ACTIVE_STATUSES.includes(j.status))],
        ["Failed", (jobs ?? []).filter((j) => ["failed", "timed_out", "paused"].includes(j.status))],
        ["Done", (jobs ?? []).filter((j) => ["succeeded", "cancelled"].includes(j.status))],
      ]
    : [["Recent jobs", jobs ?? []]];

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

  return (
    <div className="flex flex-col gap-5">
      {startInPanel ? (
        <>
          <Button size="sm" className="self-start" onClick={() => setStartOpen(true)}>
            Start a job
          </Button>
          <DetailPanel open={startOpen} title="Start a job" onClose={() => setStartOpen(false)}>
            <JobStartForm
              onChanged={load}
              onStarted={(id) => {
                setStartOpen(false);
                setOpen(id);
              }}
            />
          </DetailPanel>
        </>
      ) : (
        <JobStartForm onChanged={load} onStarted={setOpen} />
      )}

      <section aria-label="Jobs" className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-ink">Recent jobs</h2>
        {error && <p className="text-sm text-destructive">Couldn't load jobs: {error}</p>}
        {!jobs && !error && <p className="text-sm text-muted">Loading…</p>}
        {jobs && jobs.length === 0 && (
          <p className="px-1 text-sm text-muted">No jobs yet. Ask Sazed to research something, or start one above.</p>
        )}
        {jobs && jobs.length > 0 && (
          <div className="flex flex-col gap-4">
            {jobGroups.map(([label, items]) =>
              items.length > 0 ? (
                <section key={label} aria-label={label} className="flex flex-col gap-2">
                  {grouped && <h3 className="px-1 text-sm font-medium text-ink">{label}</h3>}
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {items.map((j) => (
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
                </section>
              ) : null
            )}
          </div>
        )}
      </section>

      <JobSheet jobId={open} onClose={() => setOpen(null)} onChanged={load} onOpenJob={setOpen} />
    </div>
  );
}
