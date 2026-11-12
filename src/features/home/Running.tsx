import { jobCardId, type WorkingJob } from "@/api/command";
import { cn } from "@/lib/utils";

import { CardActions } from "./CardActions";
import { Group, MoreLink } from "./Group";
import { goTo, openDispatch } from "./homeNav";
import { StepLine } from "./StepLine";
import { clock } from "./steps";

const AGENT: Record<WorkingJob["agent"], string> = { claude: "Claude Code", agy: "agy" };

function sub(job: WorkingJob): string {
  return (job.kind === "dispatch" ? [`plan ${job.plan}`, job.profile] : [job.repo, AGENT[job.agent], job.model])
    .filter(Boolean)
    .join(" · ");
}

interface Props {
  jobs: WorkingJob[] | null;
  onOpenJob: (jobId: string) => void;
  onChanged: () => void;
}

/** Running work, one row each. Home offers only Stop; Steer stays in the job sheet a tap away. */
export function Running({ jobs, onOpenJob, onChanged }: Props) {
  return (
    <Group
      name="Running"
      count={jobs ? jobs.length : null}
      empty="No agents are working."
      extra={<MoreLink onClick={() => goTo({ hub: "agents", view: "runs" })}>All runs</MoreLink>}
    >
      <ul>
        {(jobs ?? []).map((job) => {
          const open = job.job_id ? () => onOpenJob(job.job_id!) : job.plan ? () => openDispatch(job.plan!) : null;
          const stop = job.actions.filter((a) => a.id === "stop");
          return (
            <li
              key={job.job_id ?? `${job.plan}:${job.task}`}
              onClick={open ?? undefined}
              className={cn(
                "grid min-h-12 grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 px-1 py-2 sm:rounded-lg sm:px-3",
                open && "cursor-pointer sm:hover:bg-surface"
              )}
            >
              <span aria-hidden="true" className="flex justify-center">
                {job.status !== "queued" ? (
                  <span className="size-[11px] animate-spin rounded-full border-[1.5px] border-line border-t-ink motion-reduce:animate-none" />
                ) : (
                  <span className="size-[9px] rounded-full border-[1.5px] border-dashed border-muted" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-body font-medium text-ink">{job.title}</span>
                <span className="block truncate text-caption text-muted">{sub(job)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-meta whitespace-nowrap text-muted tabular-nums">
                  {job.status === "queued" ? "queued" : clock(job.elapsed_s)}
                </span>
                {job.job_id && stop.length > 0 && (
                  <CardActions cardId={jobCardId(job.job_id)} actions={stop} onDone={onChanged} touch />
                )}
              </span>
              {job.kind === "dispatch" && job.line && job.steps.length === 0 ? (
                <p className="col-span-2 col-start-2 truncate text-meta text-ink-2" title={job.line}>
                  {job.line}
                </p>
              ) : (
                job.steps[0] && <StepLine step={job.steps[0]} className="col-span-2 col-start-2" />
              )}
            </li>
          );
        })}
      </ul>
    </Group>
  );
}
