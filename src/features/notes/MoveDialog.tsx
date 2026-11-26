import { useEffect, useState } from "react";

import { errorText } from "@/api/homelab";
import { moveNote } from "@/api/notes";
import type { MovedNote, Note, Topic } from "@/api/notes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { topicProblem } from "./topics";

interface Props {
  note: Pick<Note, "path" | "topic"> | null;
  topics: Topic[];
  onClose: () => void;
  onMoved: (moved: MovedNote) => void;
}

export function MoveDialog({ note, topics, onClose, onMoved }: Props) {
  const [name, setName] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName("");
    setProblem(null);
    setError(null);
  }, [note]);

  const current = note?.topic?.toLowerCase() ?? null;
  const choices = topics.filter((t) => t.name.toLowerCase() !== current);

  async function move(topic: string) {
    if (!note) return;
    setBusy(true);
    setError(null);
    try {
      onMoved(await moveNote(note.path, topic));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const found = topicProblem(name);
    setProblem(found);
    if (found === null) void move(name.trim());
  }

  return (
    <Dialog open={note !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to a topic</DialogTitle>
          <DialogDescription>Pick a topic or name a new one.</DialogDescription>
        </DialogHeader>
        {choices.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {choices.map((topic) => (
              <Button
                key={topic.name}
                variant="outline"
                disabled={busy}
                className="min-h-11 rounded-full px-3.5 sm:min-h-0"
                onClick={() => void move(topic.name)}
              >
                {topic.name}
                <span className="font-mono text-[11px] text-muted">{topic.count}</span>
              </Button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            aria-label="New topic"
            value={name}
            disabled={busy}
            aria-invalid={problem !== null}
            placeholder="New topic"
            onChange={(e) => {
              setName(e.target.value);
              setProblem(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            className="min-h-11 flex-1 sm:min-h-0"
          />
          <Button disabled={busy} className="min-h-11 sm:min-h-0" onClick={submit}>
            Move
          </Button>
        </div>
        {problem && <p className="text-sm text-destructive">{problem}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
