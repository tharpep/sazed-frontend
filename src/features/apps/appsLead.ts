import type { Service } from "@/api/homelab";
import { statusOf } from "@/features/homelab/format";

function nameList(names: string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "11 apps, qBittorrent in maintenance": the count, then any app down or in maintenance. "All up"
 * only when every app reports up, since an unreported one is not known to be up. */
export function appsLead(apps: Service[]): string {
  const count = `${apps.length} ${apps.length === 1 ? "app" : "apps"}`;
  const down = apps.filter((s) => statusOf(s) === "down").map((s) => s.name);
  const maintenance = apps.filter((s) => statusOf(s) === "maintenance").map((s) => s.name);
  const problems = [
    ...(down.length ? [`${nameList(down)} down`] : []),
    ...(maintenance.length ? [`${nameList(maintenance)} in maintenance`] : []),
  ];
  if (problems.length) return `${count}, ${problems.join(", ")}`;
  return apps.length > 0 && apps.every((s) => statusOf(s) === "up") ? `${count}, all up` : count;
}
