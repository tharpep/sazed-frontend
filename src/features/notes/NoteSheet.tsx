import { useEffect, useState, type KeyboardEvent } from "react";

import {
  deleteNote,
  moveNote,
  readNote,
  saveNote,
  type FullNote,
  type MovedNote,
  type Note,
  type Topic,
} from "@/api/notes";
import { errorText } from "@/api/homelab";
import { DetailPanel } from "@/components/shell/DetailPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MoveDialog } from "./MoveDialog";
import { canFix, canSave, isDirty, noteFacts, saveError } from "./noteEdit";
import { filedText, quickTopics } from "./topics";

interface Props {
  note: Note | null;
  onClose: () => void;
  onChanged: () => void;
  onKeep: (note: Note) => void;
  topics?: Topic[];
  onMoved?: (note: Note) => void;
}

const NO_TOPICS: Topic[] = [];

function ignoreMoved() {}

type Leave = "cancel" | "close" | "switch";

const FOOTER_BUTTON = "h-11 px-3 sm:h-8";

export function NoteSheet({
  note: requested,
  onClose,
  onChanged,
  onKeep,
  topics = NO_TOPICS,
  onMoved = ignoreMoved,
}: Props) {
  const [note, setNote] = useState<Note | null>(requested);
  const path = note?.path ?? null;
  const [full, setFull] = useState<FullNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState<Leave | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    setFull(null);
    setError(null);
    setFixing(false);
    setDraft("");
    setBusy(false);
    setLeaving(null);
    setConfirmDelete(false);
    setMoving(false);
    if (!path) return;
    let cancelled = false;
    readNote(path)
      .then((f) => !cancelled && setFull(f))
      .catch((err) => !cancelled && setError(errorText(err)));
    return () => {
      cancelled = true;
    };
  }, [path]);

  const dirty = fixing && full !== null && isDirty(full.text, draft);

  useEffect(() => {
    if ((requested?.path ?? null) === path) return;
    if (dirty) setLeaving("switch");
    else setNote(requested);
  }, [requested, path, dirty]);

  function leave(what: Leave) {
    if (dirty) {
      setLeaving(what);
      return;
    }
    finish(what);
  }

  function finish(what: Leave) {
    setLeaving(null);
    setFixing(false);
    setError(null);
    if (what === "close") onClose();
    if (what === "switch") setNote(requested);
  }

  function keep() {
    if (leaving === "switch" && note) onKeep(note);
    setLeaving(null);
  }

  function startFix() {
    if (!full) return;
    setDraft(full.text);
    setError(null);
    setFixing(true);
  }

  async function save() {
    if (!full || !path || busy || !canSave(full.text, draft)) return;
    const text = draft.trim();
    setBusy(true);
    setError(null);
    try {
      const saved = await saveNote(path, text, full.version);
      setFull({ ...full, text, version: saved.version });
      setFixing(false);
      onChanged();
    } catch (err) {
      setError(saveError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!path) return;
    setConfirmDelete(false);
    setBusy(true);
    setError(null);
    try {
      await deleteNote(path);
      onChanged();
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function applyMove(result: MovedNote) {
    if (!note) return;
    const moved: Note = { ...note, path: result.path, topic: result.topic, folder: "notes" };
    setMoving(false);
    setNote(moved);
    onMoved(moved);
    onChanged();
  }

  async function quickMove(topic: string) {
    if (!path || busy) return;
    setBusy(true);
    setError(null);
    try {
      applyMove(await moveNote(path, topic));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void save();
    }
  }

  let footer = null;
  if (note && canFix(note.folder)) {
    footer = fixing ? (
      <>
        <Button
          className={FOOTER_BUTTON}
          disabled={busy || !full || !canSave(full.text, draft)}
          onClick={save}
        >
          Save
        </Button>
        <Button variant="outline" className={FOOTER_BUTTON} disabled={busy} onClick={() => leave("cancel")}>
          Cancel
        </Button>
      </>
    ) : (
      <>
        <Button variant="outline" className={FOOTER_BUTTON} disabled={busy || !full} onClick={startFix}>
          Fix
        </Button>
        <Button
          variant="destructive"
          className={FOOTER_BUTTON}
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
        >
          Delete
        </Button>
      </>
    );
  }

  return (
    <DetailPanel
      open={note !== null}
      title="Note"
      description={note ? noteFacts(note, new Date()) : undefined}
      onClose={() => leave("close")}
      footer={footer}
    >
      {fixing ? (
        <Textarea
          autoFocus
          rows={8}
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Note text"
          className="min-h-48 text-base sm:text-sm"
        />
      ) : (
        <>
          {!error && full === null && <p className="text-sm text-muted">Loading…</p>}
          {full !== null && (
            <div className="rounded-md border border-border bg-surface p-3 text-sm whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">
              {full.text}
            </div>
          )}
        </>
      )}
      {full !== null && !fixing && note && canFix(note.folder) && (
        <FiledUnder
          full={full}
          topics={topics}
          busy={busy}
          onQuick={(topic) => void quickMove(topic)}
          onMore={() => setMoving(true)}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {note && <p className="text-xs text-muted">Stored as {note.path}</p>}
      {note && !canFix(note.folder) && (
        <p className="text-xs text-muted">Written by an agent. Read-only here.</p>
      )}

      <MoveDialog
        note={moving && full ? full : null}
        topics={topics}
        onClose={() => setMoving(false)}
        onMoved={applyMove}
      />

      <Dialog open={leaving !== null} onOpenChange={(open) => !open && keep()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard your changes?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={keep}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={() => leaving && finish(leaving)}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this note?</DialogTitle>
            <DialogDescription>
              It leaves your notes. It can be brought back from the notes folder's history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DetailPanel>
  );
}

const PILL = "min-h-11 rounded-full px-3.5 text-ink-2 sm:min-h-0";

interface FiledUnderProps {
  full: FullNote;
  topics: Topic[];
  busy: boolean;
  onQuick: (topic: string) => void;
  onMore: () => void;
}

function FiledUnder({ full, topics, busy, onQuick, onMore }: FiledUnderProps) {
  const filed = filedText(full);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-2">
        {filed ? (
          <>
            {filed.lead}
            <strong className="font-semibold text-ink">{filed.topic}</strong>
            {filed.tail}
          </>
        ) : (
          "Not filed yet."
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {full.topic && (
          <Button
            variant="outline"
            aria-pressed
            tabIndex={-1}
            className={`${PILL} pointer-events-none bg-raised text-ink`}
          >
            {full.topic}
          </Button>
        )}
        {quickTopics(topics, full.topic).map((topic) => (
          <Button
            key={topic.name}
            variant="outline"
            disabled={busy}
            className={PILL}
            onClick={() => onQuick(topic.name)}
          >
            {topic.name}
          </Button>
        ))}
        <Button variant="outline" disabled={busy} className={PILL} onClick={onMore}>
          Move to…
        </Button>
      </div>
    </div>
  );
}
