import { useEffect, useState } from "react";

import { getActivitySummary } from "@/api/activity";

const POLL_MS = 60_000;

/** Jobs and approvals waiting on Pryce, for the nav badge. Polls only while the page is visible. */
export function useWaitingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const tick = () =>
      getActivitySummary()
        .then((s) => setCount(s.now.jobs_waiting + s.now.approvals_pending))
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
