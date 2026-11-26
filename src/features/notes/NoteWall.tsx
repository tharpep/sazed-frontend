import type { Note } from "@/api/notes";
import { useIsMobile } from "@/hooks/useIsMobile";
import { groupByDay, noteWeight, splitColumns } from "./format";
import { NoteCard } from "./NoteCard";

interface Props {
  notes: Note[];
  onOpen: (note: Note) => void;
  onMove: (note: Note) => void;
}

export function NoteWall({ notes, onOpen, onMove }: Props) {
  const columns = useIsMobile() ? 2 : 3;
  const now = new Date();

  return (
    <div className="flex flex-col gap-5">
      {groupByDay(notes, now).map((day) => (
        <section key={day.key} aria-label={day.label} className="flex flex-col gap-2">
          <h2 className="flex items-baseline gap-2 text-meta font-medium text-ink">
            {day.label}
            {day.sub && <span className="font-normal text-muted">{day.sub}</span>}
          </h2>
          <div className="flex items-start gap-2">
            {splitColumns(day.notes, columns, noteWeight).map((column, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col gap-2">
                {column.map((note) => (
                  <NoteCard key={note.path} note={note} now={now} onOpen={onOpen} onMove={onMove} />
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
