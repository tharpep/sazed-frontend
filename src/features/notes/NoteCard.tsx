import type { Note } from "@/api/notes";
import { cardText, timeLabel } from "./format";

const LEADING_HEADING_MARK = /^#{1,6}\s+/;

export function NoteCard({ note, onOpen }: { note: Note; onOpen: (note: Note) => void }) {
  const text = cardText(note).replace(LEADING_HEADING_MARK, "");
  const firstLine = text.split("\n")[0].trim();

  return (
    <article>
      <button
        type="button"
        onClick={() => onOpen(note)}
        className="block w-full rounded-[10px] border border-line bg-surface p-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="mb-1 flex items-baseline gap-2">
          {!firstLine.startsWith(note.title.trim()) && (
            <span className="min-w-0 truncate text-caption font-normal text-muted">{note.title}</span>
          )}
          <time dateTime={note.time} className="ml-auto shrink-0 font-mono text-[11px] text-muted">
            {timeLabel(note.time)}
          </time>
        </span>
        <span className="text-body block break-words whitespace-pre-line text-ink">{text}</span>
      </button>
    </article>
  );
}
