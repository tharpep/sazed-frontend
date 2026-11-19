import { describe, expect, it } from "vitest";

import { MODEL_PATTERN, NAME_PATTERN } from "@/api/profiles";
import { DASH, budget, effort, toolCalls } from "./format";

describe("profile facts", () => {
  it("reads a NULL budget as no cap and a NULL effort as a dash", () => {
    expect(budget(null)).toBe("no cap");
    expect(budget(0.5)).toBe("$0.50");
    expect(effort(null)).toBe(DASH);
    expect(effort("high")).toBe("high");
    expect(toolCalls(null)).toBe("no cap");
  });

  it("accepts the registry's names and each engine's models", () => {
    expect(NAME_PATTERN.test("research_quick")).toBe(true);
    expect(MODEL_PATTERN.agy.test("gemini-3.8-flash-high")).toBe(true);
    expect(MODEL_PATTERN.agy.test("sonnet")).toBe(false);
    expect(MODEL_PATTERN.claude.test("claude-sonnet-5-5")).toBe(true);
    expect(MODEL_PATTERN.claude.test("gemini-3.8-flash-high")).toBe(false);
  });
});
