import { describe, expect, it } from "vitest";

import type { ItemRef } from "@/store/navStore";
import { newerRunsItem } from "./RunsPage";

const job: ItemRef = { kind: "job", id: "j1" };
const dispatch: ItemRef = { kind: "dispatch", id: "plan-a" };
const profile: ItemRef = { kind: "profile", id: "implement" };

describe("newerRunsItem", () => {
  it("shows whichever of the two is open alone", () => {
    expect(newerRunsItem([], "j1", null)).toBe("job");
    expect(newerRunsItem([], null, "plan-a")).toBe("dispatch");
    expect(newerRunsItem([], null, null)).toBeNull();
  });

  it("shows a job picked after the dispatch run", () => {
    expect(newerRunsItem([profile, job, dispatch], "j1", "plan-a")).toBe("job");
  });

  it("shows a dispatch run picked after the job", () => {
    expect(newerRunsItem([dispatch, profile, job], "j1", "plan-a")).toBe("dispatch");
  });

  it("keeps Plan Live when neither pick is in Recent", () => {
    expect(newerRunsItem([profile], "j1", "plan-a")).toBe("dispatch");
  });
});
