import { useEffect, useState } from "react";

import { getActivitySummary } from "@/api/activity";

const POLL_MS = 15_000;

/** Jobs and dispatch runs in progress, for the More spinner. Polls only while the page is visible. */
export function useRunningCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const tick = () =>
      getActivitySummary()
        .then((s) => setCount(s.now.jobs_running + s.now.runs_running))
        .catch(() => undefined);
    tick();
    const id = setInterval(() => !document.hidden && tick(), POLL_MS);
    const onVisible = () => !document.hidden && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return count;
}
