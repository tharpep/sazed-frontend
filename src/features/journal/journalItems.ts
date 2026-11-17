import { getEntry, listEntries, type JournalCategory, type JournalEntry } from "@/api/journal";
import type { PaletteItem } from "@/nav/paletteSources";
import { useNavStore } from "@/store/navStore";

// Personal is schema-ready on the backend but the UI surface for switching stays off until we
// explicitly enable it.
export const ACTIVE_CATEGORY: JournalCategory = "career";

export const PAGE_SIZE = 30;

// Recent ids whose fetch failed (a deleted entry), so the palette does not ask again each time it
// opens.
const failedIds = new Set<string>();

function journalItem(entry: JournalEntry): PaletteItem {
  return {
    ref: { kind: "journal", id: entry.id },
    label: entry.title,
    hint: ["Journal entry", entry.entry_date, entry.subcategory].filter(Boolean).join(" · "),
  };
}

/** The latest page of entries, plus any recently opened entry older than that page, so Recent
 * shows its title rather than its id. */
export async function journalItems(): Promise<PaletteItem[]> {
  const { entries } = await listEntries({ category: ACTIVE_CATEGORY, limit: PAGE_SIZE });
  const loaded = new Set(entries.map((e) => e.id));
  const missing = useNavStore
    .getState()
    .recent.filter((ref) => ref.kind === "journal" && !loaded.has(ref.id) && !failedIds.has(ref.id));
  const older = await Promise.all(
    missing.map((ref) =>
      getEntry(ref.id).catch(() => {
        failedIds.add(ref.id);
        return null;
      })
    )
  );
  return [...entries, ...older.filter((e): e is JournalEntry => e !== null)].map(journalItem);
}
