import type { Service } from "@/api/homelab";
import { statusOf } from "@/features/homelab/format";

function nameList(names: string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "9 apps · qBittorrent in maintenance": the Apps group's count, matching its heading, then any
 * app down or in maintenance from either group. "All up" only when every app reports up, since an
 * unreported one is not known to be up. Clauses join with " · " because name lists use commas. */
export function appsLead(apps: Service[]): string {
  const inGroup = apps.filter((s) => s.group === "apps").length;
  const count = `${inGroup} ${inGroup === 1 ? "app" : "apps"}`;
  const down = apps.filter((s) => statusOf(s) === "down").map((s) => s.name);
  const maintenance = apps.filter((s) => statusOf(s) === "maintenance").map((s) => s.name);
  const problems = [
    ...(down.length ? [`${nameList(down)} down`] : []),
    ...(maintenance.length ? [`${nameList(maintenance)} in maintenance`] : []),
  ];
  if (problems.length) return [count, ...problems].join(" · ");
  return apps.length > 0 && apps.every((s) => statusOf(s) === "up") ? `${count} · all up` : count;
}
