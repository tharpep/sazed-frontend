import { useEffect, useRef, useState } from "react";

import type { WorkingJob } from "@/api/command";
import { getJob } from "@/api/jobs";

const EVERY_MS = 30_000;

/** heartbeat_at per running worker job, fetched at most once per 30 s per job and only while the
 * job is listed. Driven by the command poll, so it stops whenever that poll does. Absent until
 * the first answer; null when the job has never beaten. */
export function useHeartbeats(working: WorkingJob[] | null): Record<string, string | null> {
  const [beats, setBeats] = useState<Record<string, string | null>>({});
  const fetchedAt = useRef(new Map<string, number>());
  const listed = useRef(new Set<string>());

  useEffect(() => {
    const ids = (working ?? []).flatMap((j) => (j.kind === "job" && j.status === "running" && j.job_id ? [j.job_id] : []));
    listed.current = new Set(ids);
    for (const id of fetchedAt.current.keys()) if (!listed.current.has(id)) fetchedAt.current.delete(id);
    const now = Date.now();
    for (const id of ids) {
      if (now - (fetchedAt.current.get(id) ?? 0) < EVERY_MS) continue;
      fetchedAt.current.set(id, now);
      getJob(id, false).then(
        (job) => {
          if (!listed.current.has(id)) return;
          setBeats((prev) => {
            const kept = Object.fromEntries(Object.entries(prev).filter(([k]) => listed.current.has(k)));
            return { ...kept, [id]: job.heartbeat_at ?? null };
          });
        },
        () => undefined
      );
    }
  }, [working]);

  return beats;
}
