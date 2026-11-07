import { jobCardId, type WorkingJob } from "@/api/command";

import { CardActions } from "./CardActions";
import { StepLine } from "./StepLine";
import { clock } from "./steps";

const AGENT: Record<WorkingJob["agent"], string> = { claude: "Claude Code", agy: "agy" };

function Meter({ job }: { job: WorkingJob }) {
  if (job.status === "queued") return <span className="font-mono text-caption text-muted">queued</span>;
  const pct = job.timeout_s ? Math.min(100, (job.elapsed_s / job.timeout_s) * 100) : 0;
  return (
    <span className="flex items-center gap-1.5 font-mono text-caption whitespace-nowrap text-muted tabular-nums">
      {job.timeout_s && (
        <span aria-hidden="true" className="h-1 w-12 overflow-hidden rounded-full bg-raised">
          <span className="block h-full bg-muted" style={{ width: `${pct}%` }} />
        </span>
      )}
      {clock(job.elapsed_s)}
      {job.timeout_s ? ` of ${clock(job.timeout_s)}` : ""}
    </span>
  );
}

interface Props {
  jobs: WorkingJob[];
  onOpenJob: (jobId: string) => void;
  onChanged: () => void;
}

export function WorkingNow({ jobs, onOpenJob, onChanged }: Props) {
  return (
    <section aria-label="Working now" className="flex flex-col gap-2">
      <h2 className="px-0.5 text-meta font-semibold text-ink">
        Working now <span className="font-normal text-muted">{jobs.length ? `${jobs.length} · across every repo` : ""}</span>
      </h2>
      {jobs.length === 0 && (
        <p className="rounded-lg border border-line bg-surface px-3.5 py-3 text-meta text-muted">No agents are working.</p>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5">
        {jobs.map((job) => (
          <article
            key={job.job_id}
            onClick={() => onOpenJob(job.job_id)}
            className="flex min-w-0 cursor-pointer flex-col gap-1 rounded-lg border border-primary/40 bg-surface px-3 py-2.5 hover:bg-raised/60"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                {job.status === "running" && (
                  <span aria-hidden="true" className="size-2 shrink-0 animate-pulse rounded-full bg-primary" />
                )}
                <span className="truncate text-body font-medium text-ink">{job.title}</span>
              </span>
              <span className="shrink-0 rounded bg-raised px-1.5 font-mono text-caption text-muted">{job.profile}</span>
            </div>
            <div className="truncate text-caption text-muted">
              {[job.repo, AGENT[job.agent], job.model, job.tools ? `${job.tools} tools` : null].filter(Boolean).join(" · ")}
            </div>
            <div className="flex min-h-9 flex-col gap-0.5 py-0.5">
              {job.steps.map((s, i) => (
                <StepLine key={i} step={s} />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Meter job={job} />
              <CardActions cardId={jobCardId(job.job_id)} actions={job.actions} onDone={onChanged} className="min-w-0" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
