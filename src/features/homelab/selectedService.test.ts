import { describe, expect, it } from "vitest";

import type { Service } from "@/api/homelab";
import { selectedService, visibleServices } from "./format";

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

const SERVICES = [service({ id: "jellyfin" }), service({ id: "secret", private: true })];

describe("visibleServices", () => {
  it("hides private services until revealed", () => {
    expect(visibleServices(SERVICES, false).map((s) => s.id)).toEqual(["jellyfin"]);
    expect(visibleServices(SERVICES, true).map((s) => s.id)).toEqual(["jellyfin", "secret"]);
  });
});

describe("selectedService: the open service on the Homelab page", () => {
  it("shows a visible service", () => {
    expect(selectedService(SERVICES, "jellyfin", false)).toEqual({ service: SERVICES[0], stale: false });
  });

  it("never shows a private service while private services are hidden, and marks it for dropping", () => {
    expect(selectedService(SERVICES, "secret", false)).toEqual({ service: null, stale: true });
    expect(selectedService(SERVICES, "secret", true)).toEqual({ service: SERVICES[1], stale: false });
  });

  it("marks an id the loaded list does not have for dropping", () => {
    expect(selectedService(SERVICES, "removed", true)).toEqual({ service: null, stale: true });
  });

  it("keeps the id while the list has not loaded, and has nothing to drop with nothing open", () => {
    expect(selectedService(null, "jellyfin", false)).toEqual({ service: null, stale: false });
    expect(selectedService(SERVICES, null, false)).toEqual({ service: null, stale: false });
  });
});
