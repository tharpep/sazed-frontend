import { describe, expect, it, vi } from "vitest";

import type { KbSource } from "@/api/kb";

const api = vi.hoisted(() => ({ listKbSources: vi.fn() }));

vi.mock("@/api/kb", () => ({ listKbSources: api.listKbSources }));

import { sourceItems } from "./sourceItems";

function source(over: Partial<KbSource> & { file_id: string }): KbSource {
  return {
    filename: over.file_id,
    origin: "url",
    category: "",
    status: "active",
    summary: null,
    modified_time: null,
    last_synced: null,
    chunk_count: 1,
    content_chars: 10,
    ...over,
  };
}

describe("sourceItems: knowledge sources as palette items", () => {
  it("offers the active sources the page lists, named by file name", async () => {
    api.listKbSources.mockResolvedValue([
      source({ file_id: "f1", filename: "Tailscale serve notes", category: "homelab" }),
      source({ file_id: "f2", filename: "Old Drive doc", origin: "drive", status: "deleted" }),
      source({ file_id: "f3", filename: "pasted", origin: "text" }),
    ]);
    expect(await sourceItems()).toEqual([
      { ref: { kind: "source", id: "f1" }, label: "Tailscale serve notes", hint: "Knowledge source · Web page · homelab" },
      { ref: { kind: "source", id: "f3" }, label: "pasted", hint: "Knowledge source · Text" },
    ]);
  });
});
