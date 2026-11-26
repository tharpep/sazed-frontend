import type { Note } from "@/api/notes";
import { Button } from "@/components/ui/button";
import { cardText, timeLabel } from "./format";
import { filedText, isFresh } from "./topics";

const LEADING_HEADING_MARK = /^#{1,6}\s+/;

interface Props {
  note: Note;
  now: Date;
  onOpen: (note: Note) => void;
  onMove: (note: Note) => void;
}

export function NoteCard({ note, now, onOpen, onMove }: Props) {
  const text = cardText(note).replace(LEADING_HEADING_MARK, "");
  const firstLine = text.split("\n")[0].trim();
  const filed = filedText(note);

  return (
    <article className="rounded-[10px] border border-line bg-surface">
      <button
        type="button"
        onClick={() => onOpen(note)}
        className="block w-full rounded-[inherit] p-2.5 text-left focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="mb-1 flex items-baseline gap-2">
          {note.topic && <span className="min-w-0 truncate text-caption font-normal text-muted">{note.topic}</span>}
          {!firstLine.startsWith(note.title.trim()) && (
            <span className="min-w-0 truncate text-caption font-normal text-muted">{note.title}</span>
          )}
          <time dateTime={note.time} className="ml-auto shrink-0 font-mono text-[11px] text-muted">
            {timeLabel(note.time)}
          </time>
        </span>
        <span className="text-body block break-words whitespace-pre-line text-ink">{text}</span>
      </button>
      {filed && isFresh(note, now) && (
        <p className="flex flex-wrap items-center gap-x-1 border-t border-line px-2.5 text-caption text-ink-2">
          <span>
            {filed.lead}
            <strong className="font-semibold text-ink">{filed.topic}</strong>
            {filed.tail}
          </span>
          <Button
            variant="link"
            onClick={() => onMove(note)}
            className="h-auto min-h-11 px-1 text-caption sm:min-h-0 sm:py-1.5"
          >
            Move
          </Button>
        </p>
      )}
    </article>
  );
}
