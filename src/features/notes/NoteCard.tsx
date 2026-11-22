import type { Note } from "@/api/notes";
import { cardText, timeLabel } from "./format";

export function NoteCard({ note }: { note: Note }) {
  const text = cardText(note);
  const firstLine = note.excerpt.trim().split("\n")[0].trim();

  return (
    <article className="rounded-[10px] border border-line bg-surface p-2.5">
      <div className="mb-1 flex items-baseline gap-2">
        {note.title.trim() !== firstLine && (
          <h3 className="min-w-0 truncate text-caption font-normal text-muted">{note.title}</h3>
        )}
        <time dateTime={note.time} className="ml-auto shrink-0 font-mono text-[11px] text-muted">
          {timeLabel(note.time)}
        </time>
      </div>
      <p className="text-body break-words whitespace-pre-line text-ink">{text}</p>
    </article>
  );
}
