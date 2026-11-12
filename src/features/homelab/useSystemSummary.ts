import { useEffect, useState } from "react";

import { fetchServices, type Service } from "@/api/homelab";
import { useUiStore } from "@/store/uiStore";
import { statusOf, visibleServices } from "./format";

/** One line for System in the More sheet. Private services count only once revealed, as on the
 * Homelab page. */
export function systemSummary(services: Service[], privateRevealed: boolean): string {
  const shown = visibleServices(services, privateRevealed).filter((s) => s.lifecycle !== "planned");
  const down = shown.filter((s) => statusOf(s) === "down").length;
  if (down > 0) return `${down} down`;
  const maintenance = shown.filter((s) => statusOf(s) === "maintenance").length;
  if (maintenance > 0) return `${maintenance} in maintenance`;
  return `All ${shown.length} up`;
}

/** The System summary, fetched each time `active` turns true (the More sheet opening), so nothing
 * polls while the sheet is shut. Undefined until the first answer. */
export function useSystemSummary(active: boolean): string | undefined {
  const [services, setServices] = useState<Service[] | null>(null);
  const privateRevealed = useUiStore((s) => s.privateRevealed);

  useEffect(() => {
    if (!active) return;
    let live = true;
    fetchServices()
      .then((r) => live && setServices(r.services))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [active]);

  return services ? systemSummary(services, privateRevealed) : undefined;
}
