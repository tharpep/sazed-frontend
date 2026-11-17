import { beforeEach, describe, expect, it, vi } from "vitest";

import type { JournalEntry } from "@/api/journal";

const api = vi.hoisted(() => ({ listEntries: vi.fn(), getEntry: vi.fn() }));

vi.mock("@/api/journal", () => ({ listEntries: api.listEntries, getEntry: api.getEntry }));

import { useNavStore } from "@/store/navStore";
import { journalItems } from "./journalItems";

function entry(id: string, title: string): JournalEntry {
  return {
    id,
    entry_date: "2026-11-12",
    category: "career",
    subcategory: "Learning",
    title,
    body: "",
    tags: [],
    created_at: "",
    updated_at: "",
  };
}

describe("journalItems: journal entries as palette items", () => {
  beforeEach(() => {
    api.listEntries.mockReset();
    api.getEntry.mockReset();
    api.listEntries.mockResolvedValue({ entries: [entry("a", "Shipped the board")], next_cursor: "c" });
  });

  it("labels each entry with its title and dates it in the hint", async () => {
    useNavStore.setState({ recent: [] });
    expect(await journalItems()).toEqual([
      { ref: { kind: "journal", id: "a" }, label: "Shipped the board", hint: "Journal entry · 2026-11-12 · Learning" },
    ]);
    expect(api.getEntry).not.toHaveBeenCalled();
  });

  it("fetches a recent entry older than the page, drops one that fails and never asks for it again", async () => {
    useNavStore.setState({
      recent: [
        { kind: "journal", id: "a" },
        { kind: "journal", id: "old" },
        { kind: "journal", id: "gone" },
        { kind: "session", id: "old" },
      ],
    });
    api.getEntry.mockImplementation(async (id: string) => {
      if (id === "old") return entry("old", "First week notes");
      throw new Error("404");
    });
    const items = await journalItems();
    expect(api.getEntry.mock.calls.map(([id]) => id)).toEqual(["old", "gone"]);
    expect(items.map((i) => i.label)).toEqual(["Shipped the board", "First week notes"]);

    api.getEntry.mockClear();
    await journalItems();
    expect(api.getEntry.mock.calls.map(([id]) => id)).toEqual(["old"]);
  });

  it("asks for one page, the size the Journal list loads", async () => {
    useNavStore.setState({ recent: [] });
    await journalItems();
    expect(api.listEntries).toHaveBeenCalledWith({ category: "career", limit: 30 });
  });
});
