import { describe, expect, it } from "vitest";

import type { Service } from "@/api/homelab";
import { systemSummary } from "./useSystemSummary";

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
    live: { up: true } as Service["live"],
    state: null,
    ...over,
  };
}

const down = { live: { up: false } as Service["live"] };
const maintenance = { state: { in_maintenance: true } as Service["state"] };

describe("systemSummary: System's line in the More sheet", () => {
  it("counts every checked service when all are up, leaving planned ones out", () => {
    expect(systemSummary([service({ id: "a" }), service({ id: "b" }), service({ id: "c", lifecycle: "planned" })], false)).toBe(
      "All 2 up"
    );
  });

  it("names how many are down before anything in maintenance", () => {
    expect(systemSummary([service({ id: "a", ...down }), service({ id: "b", ...down }), service({ id: "c", ...maintenance })], false)).toBe(
      "2 down"
    );
    expect(systemSummary([service({ id: "a" }), service({ id: "c", ...maintenance })], false)).toBe("1 in maintenance");
  });

  it("leaves a private service out until revealed", () => {
    const services = [service({ id: "a" }), service({ id: "secret", private: true, ...down })];
    expect(systemSummary(services, false)).toBe("All 1 up");
    expect(systemSummary(services, true)).toBe("1 down");
  });
});
