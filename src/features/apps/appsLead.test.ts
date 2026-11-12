import { describe, expect, it } from "vitest";

import type { Service } from "@/api/homelab";
import { appsLead } from "./appsLead";

type Health = "up" | "down" | "maintenance" | "unknown";

function app(name: string, health: Health = "up", group: Service["group"] = "apps"): Service {
  return {
    id: name.toLowerCase(),
    name,
    group,
    container: null,
    lifecycle: "active",
    description: "",
    open_url: `https://${name.toLowerCase()}.tail.ts.net/`,
    icon: null,
    depends_on: [],
    repo: null,
    private: false,
    live:
      health === "unknown"
        ? null
        : { up: health !== "down", detail: null, latency_ms: null, checked_at: null, container_status: null },
    state:
      health === "maintenance"
        ? { since: null, maintenance_until: null, in_maintenance: true, muted: false, notes: null }
        : null,
  };
}

describe("appsLead", () => {
  it("counts only the Apps group, matching its heading", () => {
    expect(appsLead([app("Jellyfin"), app("Seerr"), app("Proxmox host", "up", "infra")])).toBe("2 apps · all up");
  });

  it("names the app in maintenance after the count", () => {
    expect(appsLead([app("Jellyfin"), app("qBittorrent", "maintenance"), app("Sonarr")])).toBe(
      "3 apps · qBittorrent in maintenance"
    );
  });

  it("names flagged apps from the Homelab group too", () => {
    expect(appsLead([app("Jellyfin"), app("AdGuard Home", "down", "infra")])).toBe("1 app · AdGuard Home down");
  });

  it("lists down apps before maintenance ones, joining several names with and", () => {
    expect(appsLead([app("Radarr", "down"), app("Sonarr", "down"), app("qBittorrent", "maintenance")])).toBe(
      "3 apps · Radarr and Sonarr down · qBittorrent in maintenance"
    );
  });

  it("separates three or more names with commas and keeps clauses apart with a dot", () => {
    expect(
      appsLead([app("Radarr", "down"), app("Sonarr", "down"), app("Kavita", "down"), app("qBittorrent", "maintenance")])
    ).toBe("4 apps · Radarr, Sonarr and Kavita down · qBittorrent in maintenance");
  });

  it("names every app when all are down", () => {
    expect(appsLead([app("Jellyfin", "down"), app("Seerr", "down")])).toBe("2 apps · Jellyfin and Seerr down");
  });

  it("names only the down app when another is unreported", () => {
    expect(appsLead([app("Jellyfin", "unknown"), app("Seerr", "down"), app("Radarr")])).toBe("3 apps · Seerr down");
  });

  it("says all up only when every app reports up", () => {
    expect(appsLead([app("Jellyfin"), app("Seerr")])).toBe("2 apps · all up");
    expect(appsLead([app("Jellyfin"), app("Seerr", "unknown")])).toBe("2 apps");
  });

  it("uses the singular for one app and says nothing more for none", () => {
    expect(appsLead([app("Jellyfin")])).toBe("1 app · all up");
    expect(appsLead([])).toBe("0 apps");
  });
});
