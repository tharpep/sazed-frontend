import { describe, expect, it } from "vitest";

import type { BacklogStatus } from "@/api/backlog";
import { SUB_CHOICES } from "@/store/navStore";
import { STATUS_LABEL, TYPE_LABEL, isOpenStatus } from "./format";

describe("board filters", () => {
  it("offer every backlog type in the type picker, after All", () => {
    const [first, ...types] = SUB_CHOICES["work:board.type"];
    expect(first).toBe("all");
    expect([...types].sort()).toEqual(Object.keys(TYPE_LABEL).sort());
  });
});

describe("isOpenStatus", () => {
  it("is true only for cards still waiting on Pryce", () => {
    const open = (Object.keys(STATUS_LABEL) as BacklogStatus[]).filter(isOpenStatus);
    expect(open).toEqual(["new", "shortlisted"]);
  });
});
