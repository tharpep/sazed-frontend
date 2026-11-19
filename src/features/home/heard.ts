// Sazed's reaper ends a run silent for longer than these (sazed app/config.py,
// job_heartbeat_grace_s and dispatch_heartbeat_grace_s), so past them a running row is suspect.
export const STALE_AFTER_S = { job: 120, dispatch: 150 } as const;

export type HeardKind = keyof typeof STALE_AFTER_S;

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

export function isStale(age: number | null, kind: HeardKind): boolean {
  return age !== null && age > STALE_AFTER_S[kind];
}
