// Sazed's reaper ends a worker job silent for longer than this (sazed app/config.py,
// job_heartbeat_grace_s), so past it a running job is suspect.
export const JOB_STALE_AFTER_S = 120;
// The same reaper's grace for a dispatch task (sazed app/config.py, dispatch_heartbeat_grace_s).
export const DISPATCH_STALE_AFTER_S = 150;

/** Seconds since an ISO time, or null when there is none. Never negative. */
export function ageSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  return Number.isNaN(at) ? null : Math.max(0, Math.round((now - at) / 1000));
}

export function heardLabel(age: number | null): string {
  if (age === null) return "last heard unknown";
  if (age < 60) return `last heard ${age}s ago`;
  if (age < 3600) return `last heard ${Math.floor(age / 60)} min ago`;
  return `last heard ${Math.floor(age / 3600)}h ago`;
}

export function isStale(age: number | null, graceS = JOB_STALE_AFTER_S): boolean {
  return age !== null && age > graceS;
}
