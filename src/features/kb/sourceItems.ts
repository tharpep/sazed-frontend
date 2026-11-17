import { listKbSources } from "@/api/kb";
import type { PaletteItem } from "@/nav/paletteSources";
import { ORIGIN_LABEL } from "./format";

/** Knowledge sources as palette items, the same active rows the Knowledge page lists. */
export async function sourceItems(): Promise<PaletteItem[]> {
  return (await listKbSources())
    .filter((s) => s.status === "active")
    .map((s) => ({
      ref: { kind: "source", id: s.file_id },
      label: s.filename,
      hint: ["Knowledge source", ORIGIN_LABEL[s.origin] ?? s.origin, s.category || null].filter(Boolean).join(" · "),
    }));
}
