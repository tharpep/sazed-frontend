import type { Note } from "@/api/notes";
import { cardText, timeLabel } from "./format";
import { filedText, isFresh } from "./topics";

const LEADING_HEADING_MARK = /^#{1,6}\s+/;
const FOCUS = "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none";

interface Props {
  note: Note;
  now: Date;
  onOpen: (note: Note) => void;
  onMove: (note: Note) => void;
}

export function NoteCard({ note, now, onOpen, onMove }: Props) {
  const text = cardText(note).replace(LEADING_HEADING_MARK, "");
  const firstLine = text.split("\n")[0].trim();
  const filed = isFresh(note, now) ? filedText(note) : null;

  return (
    <article className="rounded-[10px] border border-line bg-surface">
      <button
        type="button"
        onClick={() => onOpen(note)}
        className={`block w-full rounded-[inherit] p-2.5 text-left ${FOCUS}`}
      >
        <span className="mb-1 flex items-baseline gap-2">
          {note.topic && !filed && (
            <span className="min-w-0 truncate text-caption font-normal text-muted">{note.topic}</span>
          )}
          {!firstLine.startsWith(note.title.trim()) && (
            <span className="min-w-0 truncate text-caption font-normal text-muted">{note.title}</span>
          )}
          <time dateTime={note.time} className="ml-auto shrink-0 font-mono text-[11px] text-muted">
            {timeLabel(note.time)}
          </time>
        </span>
        <span className="text-body block break-words whitespace-pre-line text-ink">{text}</span>
      </button>
      {filed && (
        <button
          type="button"
          onClick={() => onMove(note)}
          className={`block min-h-11 w-full rounded-b-[inherit] border-t border-line px-2.5 py-2 text-left text-caption text-ink-2 sm:min-h-0 ${FOCUS}`}
        >
          {filed.lead}
          <strong className="font-semibold text-ink">{filed.topic}</strong>
          {filed.tail} <span className="text-primary">Move</span>
        </button>
      )}
    </article>
  );
}
