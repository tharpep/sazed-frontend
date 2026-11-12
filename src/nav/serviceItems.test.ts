import { describe, expect, it } from "vitest";

import type { Service } from "@/api/homelab";
import { buildEntries, serviceItems } from "./paletteSources";

function service(over: Partial<Service> & { id: string }): Service {
  return {
    name: over.id,
    group: "apps",
    container: null,
    lifecycle: "active",
    description: "",
    open_url: null,
    icon: null,
    depends_on: [],
    repo: null,
    private: false,
    live: null,
    state: null,
    ...over,
  };
}

describe("serviceItems: homelab services as palette items", () => {
  const services = [
    service({ id: "proxmox", name: "Proxmox", group: "infra", open_url: "https://proxmox.tail.ts.net/" }),
    service({ id: "sazed-agent", name: "Sazed agent", group: "sazed" }),
    service({ id: "planned", lifecycle: "planned" }),
    service({ id: "secret", private: true }),
  ];

  it("offers every service's detail, with or without a URL, and hides private ones as launchableApps does", () => {
    const ids = (revealed: boolean) => serviceItems(services, revealed).map((i) => i.ref.id);
    expect(ids(false)).toEqual(["proxmox", "sazed-agent", "planned"]);
    expect(ids(true)).toEqual(["proxmox", "sazed-agent", "planned", "secret"]);
    expect(serviceItems(services, false)[0]).toEqual({ ref: { kind: "service", id: "proxmox" }, label: "Proxmox", hint: "Service" });
  });

  it("says when a service is down or in maintenance", () => {
    const hints = serviceItems(
      [
        service({ id: "up", live: { up: true } as Service["live"] }),
        service({ id: "down", live: { up: false } as Service["live"] }),
        service({ id: "maint", state: { in_maintenance: true } as Service["state"] }),
      ],
      false
    ).map((i) => i.hint);
    expect(hints).toEqual(["Service", "Service · down", "Service · in maintenance"]);
  });
});

describe("Recent: services follow the private filter too", () => {
  const services = [service({ id: "jellyfin" }), service({ id: "secret", private: true })];
  const recent = [
    { kind: "service" as const, id: "secret" },
    { kind: "plan" as const, id: "console-overhaul" },
    { kind: "service" as const, id: "jellyfin" },
  ];
  const recentIds = (revealed: boolean, list: Service[]) =>
    buildEntries({ recent, services: list, privateRevealed: revealed, items: [], theme: "system", shell: "hubs" })
      .filter((e) => e.group === "Recent")
      .map((e) => (e.kind === "item" ? e.ref.id : ""));

  it("drops a private service from Recent until revealed, and leaves other kinds alone", () => {
    expect(recentIds(false, services)).toEqual(["console-overhaul", "jellyfin"]);
    expect(recentIds(true, services)).toEqual(["secret", "console-overhaul", "jellyfin"]);
  });

  it("holds every recent service back until the list shows it is not private", () => {
    expect(recentIds(false, [])).toEqual(["console-overhaul"]);
  });
});
