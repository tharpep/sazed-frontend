import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteKbSource,
  exportKbSource,
  getKbSourceContent,
  type KbExportFormat,
  type KbSource,
} from "@/api/kb";
import { errorText } from "@/api/homelab";
import { DetailPanel } from "@/components/shell/DetailPanel";
import { ORIGIN_LABEL, addedAgo } from "./format";

interface Props {
  fileId: string | null;
  source: KbSource | undefined; // list row, when the source is in the loaded list
  onClose: () => void;
  onDeleted: () => void;
}

const FOOTER_BUTTON = "h-11 px-4 sm:h-8";

export function SourceSheet({ fileId, source, onClose, onDeleted }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setContent(null);
    setError(null);
    if (!fileId) return;
    let cancelled = false;
    getKbSourceContent(fileId)
      .then((c) => !cancelled && setContent(c.content))
      .catch((err) => !cancelled && setError(errorText(err)));
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  async function remove() {
    if (!fileId) return;
    setConfirmDelete(false);
    setBusy(true);
    try {
      await deleteKbSource(fileId);
      onDeleted();
      onClose();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function download(format: KbExportFormat) {
    if (!fileId) return;
    setBusy(true);
    try {
      const text = await exportKbSource(fileId, format);
      const type = format === "md" ? "text/markdown" : "text/plain";
      const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileStem(name)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const name = source?.filename ?? "Source";
  const facts = source
    ? [
        ORIGIN_LABEL[source.origin] ?? source.origin,
        source.category || null,
        `${source.chunk_count} chunks`,
        source.last_synced ? `added ${addedAgo(source.last_synced)}` : null,
      ].filter(Boolean)
    : [];

  const footer = (
    <>
      <Button variant="outline" className={FOOTER_BUTTON} disabled={busy} onClick={() => download("md")}>
        Download .md
      </Button>
      <Button variant="outline" className={FOOTER_BUTTON} disabled={busy} onClick={() => download("txt")}>
        Download .txt
      </Button>
      <Button variant="destructive" className={FOOTER_BUTTON} disabled={busy} onClick={() => setConfirmDelete(true)}>
        Delete
      </Button>
    </>
  );

  return (
    <DetailPanel
      open={fileId !== null}
      title={name}
      description={facts.join(" · ")}
      onClose={onClose}
      footer={footer}
    >
      {source?.summary && source.summary !== "[unavailable]" && (
        <p className="text-sm text-ink">{source.summary}</p>
      )}

      <section aria-label="Stored text" className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-ink">Stored text</h3>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && content === null && <p className="text-sm text-muted">Loading…</p>}
        {/* The panel body is the one scroller, so long text wraps here instead of scrolling inside it. */}
        {content !== null && (
          <pre className="rounded-md border border-border bg-surface p-3 font-sans text-xs whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">
            {content || "(empty)"}
          </pre>
        )}
      </section>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{name}”?</DialogTitle>
            <DialogDescription>
              Its chunks and stored text are removed from the knowledge base. This can't be undone.
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

/** Same reduction the knowledge-base export uses: titles and URLs become a safe file name. */
function fileStem(name: string): string {
  const stem = name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._]+|[._]+$/g, "");
  return stem.slice(0, 100) || "source";
}
