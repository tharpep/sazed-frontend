import { useEffect, useState } from "react";

import { errorText } from "@/api/homelab";
import { listNotes, type NoteFolder, type NotesResult } from "@/api/notes";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { EmptyState } from "@/components/system";
import { Button } from "@/components/ui/button";
import { CaptureBox } from "./CaptureBox";
import { NoteHits, NotesSearch } from "./NotesSearch";
import { NoteWall } from "./NoteWall";

const LIMIT = 100;

const CHIPS = [
  { id: "mine", label: "Mine" },
  { id: "agents", label: "Agents" },
] as const;

type Chip = (typeof CHIPS)[number]["id"];

const FOLDERS: Record<Chip, NoteFolder[]> = {
  mine: ["inbox", "notes"],
  agents: ["claude"],
};

interface Loaded extends NotesResult {
  chip: Chip;
  q: string;
}

export function NotesPage() {
  const [chip, setChip] = useState<Chip>("mine");
  const [q, setQ] = useState("");
  const [captures, setCaptures] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    async function load() {
      try {
        const result = await listNotes({ folders: FOLDERS[chip], q, limit: LIMIT });
        if (!current) return;
        setLoaded({ ...result, chip, q });
        setError(null);
      } catch (err) {
        if (current) setError(errorText(err));
      }
    }
    load();
    return () => {
      current = false;
    };
  }, [chip, q, captures]);

  const shown = loaded?.chip === chip && Boolean(loaded.q) === Boolean(q) ? loaded : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 pb-8">
          <CaptureBox onCaptured={() => setCaptures((n) => n + 1)} />

          <NotesSearch onQuery={setQ} />

          <ToolsRow
            picker={CHIPS.map(({ id, label }) => (
              <Button
                key={id}
                variant="outline"
                aria-pressed={chip === id}
                onClick={() => setChip(id)}
                className="min-h-11 rounded-full px-3.5 text-ink-2 aria-pressed:bg-raised aria-pressed:text-ink sm:min-h-0"
              >
                {label}
              </Button>
            ))}
          />

          {error && <p className="text-sm text-destructive">Couldn't load notes: {error}</p>}
          {!shown && !error && <p className="text-sm text-muted">Loading…</p>}
          {shown && <NotesBody {...shown} />}
        </div>
      </div>
    </div>
  );
}

function NotesBody({ chip, q, notes, total }: Loaded) {
  if (q) return <NoteHits q={q} notes={notes} total={total} />;
  if (notes.length > 0) return <NoteWall notes={notes} />;
  if (chip === "agents") return <p className="text-sm text-muted">No agent notes yet.</p>;
  return (
    <EmptyState title="No notes of yours yet">
      What you type or dictate here is saved as a note. You never pick a folder.
    </EmptyState>
  );
}
