import { useEffect, useState } from "react";

import { errorText } from "@/api/homelab";
import { fileNote, listNotes, listTopics, type Note, type NoteFolder, type NotesResult, type Topic } from "@/api/notes";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { EmptyState } from "@/components/system";
import { Button } from "@/components/ui/button";
import { CaptureBox } from "./CaptureBox";
import { MoveDialog } from "./MoveDialog";
import { NoteSheet } from "./NoteSheet";
import { NoteHits, NotesSearch } from "./NotesSearch";
import { NoteWall } from "./NoteWall";

const LIMIT = 100;
const ALL = "all";
const AGENTS = "agents";
const TOPIC_PREFIX = "topic:";
const NO_TOPICS: Topic[] = [];

const chipClass = "min-h-11 shrink-0 rounded-full px-3.5 text-ink-2 aria-pressed:bg-raised aria-pressed:text-ink sm:min-h-0";

function topicChip(name: string): string {
  return `${TOPIC_PREFIX}${name}`;
}

function topicOf(chip: string): string | undefined {
  return chip.startsWith(TOPIC_PREFIX) ? chip.slice(TOPIC_PREFIX.length) : undefined;
}

function queryFor(chip: string): { folders: NoteFolder[]; topic?: string } {
  if (chip === AGENTS) return { folders: ["claude"] };
  const topic = topicOf(chip);
  if (topic !== undefined) return { folders: ["notes"], topic };
  return { folders: ["inbox", "notes"] };
}

interface Loaded extends NotesResult {
  chip: string;
  q: string;
}

export function NotesPage() {
  const [chosen, setChosen] = useState(ALL);
  const [q, setQ] = useState("");
  const [reloads, setReloads] = useState(0);
  const [open, setOpen] = useState<Note | null>(null);
  const [moving, setMoving] = useState<Note | null>(null);
  const [topics, setTopics] = useState<Topic[]>(NO_TOPICS);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  const topic = topicOf(chosen);
  const chip = topic !== undefined && !topics.some((t) => t.name === topic) ? ALL : chosen;

  function reload() {
    setReloads((n) => n + 1);
  }

  function captured(path: string) {
    reload();
    fileNote(path).then(reload, () => undefined);
  }

  useEffect(() => {
    let current = true;
    listTopics().then(
      (result) => {
        if (current) setTopics(result.topics);
      },
      () => undefined
    );
    return () => {
      current = false;
    };
  }, [reloads]);

  useEffect(() => {
    let current = true;
    async function load() {
      try {
        const result = await listNotes({ ...queryFor(chip), q, limit: LIMIT });
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
  }, [chip, q, reloads]);

  const shown = loaded?.chip === chip && Boolean(loaded.q) === Boolean(q) ? loaded : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 pb-8">
          <CaptureBox onCaptured={captured} />

          <NotesSearch onQuery={setQ} />

          <ToolsRow
            picker={
              <div className="flex min-w-0 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Button variant="outline" aria-pressed={chip === ALL} onClick={() => setChosen(ALL)} className={chipClass}>
                  All
                </Button>
                {topics.map((t) => (
                  <Button
                    key={t.name}
                    variant="outline"
                    aria-pressed={chip === topicChip(t.name)}
                    onClick={() => setChosen(topicChip(t.name))}
                    className={chipClass}
                  >
                    {t.name}
                    <span className="font-mono text-[11px] text-muted">{t.count}</span>
                  </Button>
                ))}
                <Button variant="outline" aria-pressed={chip === AGENTS} onClick={() => setChosen(AGENTS)} className={chipClass}>
                  Agents
                </Button>
              </div>
            }
          />

          {error && <p className="text-sm text-destructive">Couldn't load notes: {error}</p>}
          {!shown && !error && <p className="text-sm text-muted">Loading…</p>}
          {shown && <NotesBody {...shown} onOpen={setOpen} onMove={setMoving} />}
        </div>
      </div>
      <NoteSheet
        note={open}
        onClose={() => setOpen(null)}
        topics={topics}
        onChanged={reload}
        onKeep={setOpen}
        onMoved={setOpen}
      />
      <MoveDialog
        note={moving}
        topics={topics}
        onClose={() => setMoving(null)}
        onMoved={() => {
          setMoving(null);
          reload();
        }}
      />
    </div>
  );
}

interface BodyProps extends Loaded {
  onOpen: (note: Note) => void;
  onMove: (note: Note) => void;
}

function NotesBody({ chip, q, notes, total, onOpen, onMove }: BodyProps) {
  if (q) return <NoteHits q={q} notes={notes} total={total} onOpen={onOpen} />;
  if (notes.length > 0) return <NoteWall notes={notes} onOpen={onOpen} onMove={onMove} />;
  if (chip === AGENTS) return <p className="text-sm text-muted">No agent notes yet.</p>;
  if (topicOf(chip) !== undefined) return <p className="text-sm text-muted">No notes under this topic yet.</p>;
  return (
    <EmptyState title="No notes of yours yet">
      What you type or dictate here is saved as a note. You never pick a folder.
    </EmptyState>
  );
}
