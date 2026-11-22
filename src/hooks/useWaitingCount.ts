import { useEffect, useState } from "react";

import { getActivitySummary } from "@/api/activity";
import { getCommand } from "@/api/command";
import { questionCount } from "@/features/home/sessions";

const POLL_MS = 60_000;

/** Jobs, approvals and session questions waiting on Pryce, for the nav badge. Polls only while the
 * page is visible. */
export function useWaitingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const tick = async () => {
      const [summary, command] = await Promise.allSettled([getActivitySummary(), getCommand()]);
      if (summary.status !== "fulfilled") return;
      const asked = command.status === "fulfilled" ? questionCount(command.value.sessions) : 0;
      setCount(summary.value.now.jobs_waiting + summary.value.now.approvals_pending + asked);
    };
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
