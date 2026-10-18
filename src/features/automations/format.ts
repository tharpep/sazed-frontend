import type { RunStatus } from "@/api/automations";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function clock(hour: number, minute: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/** Plain-English cron for the common shapes; anything else falls back to the raw expression. */
export function describeCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, dom, mon, dow] = parts;

  const everyMin = /^\*\/(\d+)$/.exec(min);
  if (everyMin && hour === "*" && dom === "*" && mon === "*" && dow === "*") {
    return `Every ${everyMin[1]} minutes`;
  }
  if (min === "*" && hour === "*" && dom === "*" && mon === "*" && dow === "*") return "Every minute";
  if (/^\d+$/.test(min) && hour === "*" && dom === "*" && mon === "*" && dow === "*") {
    return min === "0" ? "Every hour" : `Every hour at :${min.padStart(2, "0")}`;
  }
  if (!/^\d+$/.test(min) || !/^\d+$/.test(hour) || mon !== "*") return cron;

  const at = clock(Number(hour), Number(min));
  if (dom !== "*") return /^\d+$/.test(dom) && dow === "*" ? `Monthly on day ${dom} at ${at}` : cron;
  if (dow === "*") return `Every day at ${at}`;
  if (dow === "1-5") return `Weekdays at ${at}`;
  if (dow === "0,6" || dow === "6,0") return `Weekends at ${at}`;
  const days = dow.split(",");
  if (days.every((d) => /^[0-7]$/.test(d))) {
    const names = days.map((d) => DAY_NAMES[Number(d) % 7]);
    return `${names.length === 1 ? `${names[0]}s` : names.join(", ")} at ${at}`;
  }
  return cron;
}

/** "Mon 8:00 AM" in the automation's own timezone. */
export function shortWhen(iso: string | null | undefined, timezone: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}

export const RUN_LABEL: Record<RunStatus, string> = {
  running: "Running",
  success: "Done",
  skipped: "Nothing to report",
  needs_approval: "Needs approval",
  error: "Failed",
  missed: "Missed (Sazed was down)",
};

/** Same color rule as the Homelab page: only problems get color. */
export function runTone(status: RunStatus | null | undefined): string {
  if (status === "error") return "text-destructive";
  if (status === "needs_approval") return "text-accent";
  return "text-muted";
}

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
];
