import { describe, expect, it } from "vitest";

import type { Service } from "@/api/homelab";
import { appsLead } from "./appsLead";

function app(name: string, health: "up" | "down" | "maintenance" | "unknown" = "up"): Service {
  return {
    id: name.toLowerCase(),
    name,
    group: "apps",
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
  it("names the app in maintenance after the count", () => {
    expect(appsLead([app("Jellyfin"), app("qBittorrent", "maintenance"), app("Sonarr")])).toBe(
      "3 apps, qBittorrent in maintenance"
    );
  });

  it("lists down apps before maintenance ones, joining several names with and", () => {
    expect(appsLead([app("Radarr", "down"), app("Sonarr", "down"), app("qBittorrent", "maintenance")])).toBe(
      "3 apps, Radarr and Sonarr down, qBittorrent in maintenance"
    );
  });

  it("says all up only when every app reports up", () => {
    expect(appsLead([app("Jellyfin"), app("Seerr")])).toBe("2 apps, all up");
    expect(appsLead([app("Jellyfin"), app("Seerr", "unknown")])).toBe("2 apps");
  });

  it("uses the singular for one app and says nothing more for none", () => {
    expect(appsLead([app("Jellyfin")])).toBe("1 app, all up");
    expect(appsLead([])).toBe("0 apps");
  });
});
