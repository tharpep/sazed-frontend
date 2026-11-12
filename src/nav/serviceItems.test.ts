import { describe, expect, it } from "vitest";

import type { Service } from "@/api/homelab";
import { serviceItems } from "./paletteSources";

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
