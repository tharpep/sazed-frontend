import { useEffect, useState, type KeyboardEvent } from "react";

import { deleteNote, readNote, saveNote, type FullNote, type Note } from "@/api/notes";
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
import { canFix, canSave, isDirty, noteFacts, saveError } from "./noteEdit";

interface Props {
  note: Note | null;
  onClose: () => void;
  onChanged: () => void;
}

type Leave = "cancel" | "close";

const FOOTER_BUTTON = "h-11 px-3 sm:h-8";

export function NoteSheet({ note, onClose, onChanged }: Props) {
  const path = note?.path ?? null;
  const [full, setFull] = useState<FullNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState<Leave | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setFull(null);
    setError(null);
    setFixing(false);
    setDraft("");
    setBusy(false);
    setLeaving(null);
    setConfirmDelete(false);
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

  function leave(what: Leave) {
    if (dirty) {
      setLeaving(what);
      return;
    }
    finish(what);
  }

  function finish(what: Leave) {
    setLeaving(null);
    if (what === "close") onClose();
    else {
      setFixing(false);
      setError(null);
    }
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      {note && <p className="text-xs text-muted">Stored as {note.path}</p>}
      {note && !canFix(note.folder) && (
        <p className="text-xs text-muted">Written by an agent. Read-only here.</p>
      )}

      <Dialog open={leaving !== null} onOpenChange={(open) => !open && setLeaving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard your changes?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaving(null)}>
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
