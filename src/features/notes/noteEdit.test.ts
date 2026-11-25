import { describe, expect, it } from "vitest";

import { ApiError } from "@/api/client";
import type { Note } from "@/api/notes";
import { canFix, canSave, isDirty, noteFacts, saveError } from "./noteEdit";

function note(time: Date, folder: Note["folder"] = "notes"): Note {
  return {
    path: "n.md",
    folder,
    title: "t",
    time: time.toISOString(),
    source: null,
    excerpt: "",
    match: null,
  };
}

const NOW = new Date(2026, 10, 21, 12, 0);

describe("canFix", () => {
  it("is false only for the claude folder", () => {
    expect(canFix("inbox")).toBe(true);
    expect(canFix("notes")).toBe(true);
    expect(canFix("claude")).toBe(false);
  });
});

describe("isDirty", () => {
  it("is false for the same text and for a draft that differs only in surrounding whitespace", () => {
    expect(isDirty("hello", "hello")).toBe(false);
    expect(isDirty("hello", "  hello\n\n")).toBe(false);
    expect(isDirty("hello\n", "hello")).toBe(false);
  });

  it("is true when the text differs", () => {
    expect(isDirty("hello", "hello world")).toBe(true);
    expect(isDirty("hello", "")).toBe(true);
  });
});

describe("canSave", () => {
  it("needs a real change", () => {
    expect(canSave("hello", "hello")).toBe(false);
    expect(canSave("hello", " hello \n")).toBe(false);
    expect(canSave("hello", "hello there")).toBe(true);
  });

  it("refuses an empty or blank draft", () => {
    expect(canSave("hello", "")).toBe(false);
    expect(canSave("hello", "  \n ")).toBe(false);
  });
});

describe("saveError", () => {
  it("explains a 409", () => {
    expect(saveError(new ApiError("conflict", 409))).toBe(
      "This note changed since you opened it. Close it and open it again.",
    );
  });

  it("uses the error text for any other error", () => {
    expect(saveError(new ApiError('{"detail":"Vault is locked"}', 423))).toBe("Vault is locked");
    expect(saveError(new Error("offline"))).toBe("offline");
    expect(saveError("boom")).toBe("boom");
  });
});

describe("noteFacts", () => {
  it("says Today with the time for your note", () => {
    expect(noteFacts(note(new Date(2026, 10, 21, 12, 53)), NOW)).toBe("Today 12:53 · Written by you");
  });

  it("says Yesterday for the day before", () => {
    expect(noteFacts(note(new Date(2026, 10, 20, 8, 5), "inbox"), NOW)).toBe(
      "Yesterday 08:05 · Written by you",
    );
  });

  it("names the weekday and date for an agent's older note", () => {
    expect(noteFacts(note(new Date(2026, 10, 18, 21, 40), "claude"), NOW)).toBe(
      "Wed 18 Nov 21:40 · Written by an agent",
    );
  });
});
