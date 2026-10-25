import { cn } from "@/lib/utils";
import type { Service } from "@/api/homelab";

export type StatusKind = "up" | "down" | "maintenance" | "unknown" | "planned";

/** Maintenance outranks down: downtime during a maintenance window is expected. */
export function statusOf(s: Service): StatusKind {
  if (s.lifecycle === "planned") return "planned";
  if (s.state?.in_maintenance) return "maintenance";
  if (s.live?.up === false) return "down";
  if (s.live?.up === true) return "up";
  return "unknown";
}

export const STATUS_LABEL: Record<StatusKind, string> = {
  up: "Up",
  down: "Down",
  maintenance: "Maintenance",
  unknown: "Unknown",
  planned: "Planned",
};

/** Healthy stays quiet (neutral); only problems carry color — down is the one red,
 * maintenance uses the gold status accent. */
export function StatusDot({ kind, className }: { kind: StatusKind; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        kind === "up" && "bg-muted",
        kind === "down" && "bg-destructive",
        kind === "maintenance" && "bg-accent",
        kind === "unknown" && "border border-muted",
        kind === "planned" && "border border-dashed border-muted",
        className
      )}
    />
  );
}

/** A labeled stat tile, as used in the map panel and the storage card. */
export function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-md bg-surface px-2.5 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-sm font-medium text-ink">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  );
}

/** "45s", "5m", "3h", "2d" — compact age for status lines. */
export function age(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (secs < 5) return ""; // callers render "just now"
  if (secs < 60) return `${secs}s`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function uptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(seconds / 3600);
  return hours >= 1 ? `${hours}h` : `${Math.floor(seconds / 60)}m`;
}

export function gib(bytes: number | null | undefined): string {
  if (bytes == null) return "?";
  return (bytes / 1024 ** 3).toFixed(1);
}

export function pct(used: number | null | undefined, total: number | null | undefined): string {
  if (!used || !total) return "?";
  return `${Math.round((used / total) * 100)}%`;
}

export function fmtTime(iso: string | number): string {
  const d = typeof iso === "number" ? new Date(iso * 1000) : new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** One-line status text for a row: "down 5m · timeout", "up 3h", "maintenance · 12m left". */
export function statusLine(s: Service, now = Date.now()): string {
  const kind = statusOf(s);
  const since = age(s.state?.since, now);
  if (kind === "maintenance") {
    const until = s.state?.maintenance_until;
    // Floor, not round: the gateway sets the end time on its clock, so rounding plus a little
    // skew shows "16m left" right after starting a 15-minute window.
    const left = until ? Math.max(0, Math.floor((new Date(until).getTime() - now) / 60000)) : 0;
    return `Maintenance · ${left}m left`;
  }
  if (kind === "down") return [since ? `Down ${since}` : "Down", s.live?.detail].filter(Boolean).join(" · ");
  if (kind === "up") return since ? `Up ${since}` : "Up";
  if (kind === "planned") return "Planned";
  return "Not checked yet";
}
