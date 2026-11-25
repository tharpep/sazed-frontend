import { describe, expect, it } from "vitest";

import { undemonstrated } from "./Gallery";
import { parseMockPath } from "./mocks";

describe("gallery", () => {
  /** Every file in components/ui and components/system has a demo, so the gallery shows all that exists. */
  it("has a demo for every shared component", () => {
    expect(undemonstrated).toEqual([]);
  });
});

describe("parseMockPath", () => {
  it("reads the variant from the file name", () => {
    expect(parseMockPath("./mocks/finance.h.tsx")).toEqual({ name: "finance", variant: "h" });
  });

  it("keeps every part after the name as the variant", () => {
    expect(parseMockPath("./mocks/finance.h.v2.tsx")).toEqual({ name: "finance", variant: "h.v2" });
  });

  it("calls a single-file mock main", () => {
    expect(parseMockPath("./mocks/notes.tsx")).toEqual({ name: "notes", variant: "main" });
  });
});
