import { useEffect, useState } from "react";

import type { Note } from "@/api/notes";
import { field } from "@/features/kb/format";
import { cn } from "@/lib/utils";
import { cardText, groupByDay, splitMatch } from "./format";

const DEBOUNCE_MS = 250;

export function NotesSearch({ onQuery }: { onQuery: (q: string) => void }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => onQuery(value.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, onQuery]);

  return (
    <input
      type="search"
      enterKeyHint="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search notes"
      aria-label="Search notes"
      className={cn(field, "min-h-11 text-base sm:min-h-0 sm:text-sm")}
    />
  );
}

interface HitsProps {
  q: string;
  notes: Note[];
  total: number;
  onOpen: (note: Note) => void;
}

export function NoteHits({ q, notes, total, onOpen }: HitsProps) {
  if (notes.length === 0) return <p className="text-meta text-muted">No notes of yours match {q}.</p>;

  const now = new Date();
  return (
    <section aria-label="Matches" className="flex flex-col gap-2">
      <p className="text-meta break-words text-muted">
        {total} of your notes match <span className="text-ink">{q}</span>, plain text match.
      </p>
      <ul className="divide-y divide-line overflow-hidden rounded-[10px] border border-line">
        {notes.map((note) => (
          <li key={note.path} className="bg-surface">
            <button
              type="button"
              onClick={() => onOpen(note)}
              className="flex min-h-11 w-full flex-col gap-0.5 px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
            >
              <span className="text-body block break-words whitespace-pre-line text-ink">
                {splitMatch(note.match ?? cardText(note), q).map((piece, i) =>
                  piece.hit ? (
                    <mark key={i} className="rounded-[2px] bg-primary/20 text-ink">
                      {piece.text}
                    </mark>
                  ) : (
                    piece.text
                  )
                )}
              </span>
              <span className="text-caption block text-muted">
                {groupByDay([note], now)[0].label} · {note.folder}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
