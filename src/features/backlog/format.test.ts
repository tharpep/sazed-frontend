import { describe, expect, it } from "vitest";

import type { BacklogStatus } from "@/api/backlog";
import { SUB_CHOICES } from "@/store/navStore";
import { STATUS_LABEL, TYPE_LABEL, boardQuery, isOpenStatus } from "./format";

describe("board filters", () => {
  it("offer every backlog type in the type picker, after All", () => {
    const [first, ...types] = SUB_CHOICES["work:board.type"];
    expect(first).toBe("all");
    expect([...types].sort()).toEqual(Object.keys(TYPE_LABEL).sort());
  });
});

describe("boardQuery", () => {
  it("asks for open cards of every type when nothing is saved", () => {
    expect(boardQuery({})).toEqual({ view: "open", type: undefined });
  });

  it("asks for the saved view and type, with All sent as no type", () => {
    expect(boardQuery({ "work:board": "dismissed", "work:board.type": "bug" })).toEqual({ view: "dismissed", type: "bug" });
    expect(boardQuery({ "work:board": "done", "work:board.type": "all" })).toEqual({ view: "done", type: undefined });
  });
});

describe("isOpenStatus", () => {
  it("is true only for cards still waiting on Pryce", () => {
    const open = (Object.keys(STATUS_LABEL) as BacklogStatus[]).filter(isOpenStatus);
    expect(open).toEqual(["new", "shortlisted"]);
  });
});
