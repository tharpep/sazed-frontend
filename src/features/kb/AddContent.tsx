import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_UPLOAD_MB, UPLOAD_ACCEPT, ingestFile, ingestText, ingestUrl, type KbIngestResult } from "@/api/kb";
import { errorText } from "@/api/homelab";
import { field } from "./format";

type Mode = "file" | "text" | "url";

const MODES: [Mode, string][] = [
  ["file", "File"],
  ["text", "Text"],
  ["url", "Web page"],
];

interface Props {
  categories: string[];
  onAdded: () => void;
}

export function AddContent({ categories, onAdded }: Props) {
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const tooBig = !!file && file.size > MAX_UPLOAD_MB * 1024 * 1024;
  const ready =
    !busy &&
    (mode === "file" ? !!file && !tooBig : mode === "text" ? !!title.trim() && !!text.trim() : !!url.trim());

  async function submit() {
    setBusy(true);
    setMessage(null);
    const cat = category.trim();
    try {
      let result: KbIngestResult;
      if (mode === "file") result = await ingestFile(file!, cat);
      else if (mode === "text") result = await ingestText(title.trim(), text, cat);
      else result = await ingestUrl(url.trim(), cat);
      setMessage({ text: `Added ${result.filename} (${result.chunk_count} chunks)`, error: false });
      setFile(null);
      setTitle("");
      setText("");
      setUrl("");
      if (fileInput.current) fileInput.current.value = "";
      onAdded();
    } catch (err) {
      setMessage({ text: errorText(err), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Add to knowledge" className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div role="tablist" aria-label="Content type" className="flex gap-1 rounded-md bg-surface p-0.5">
        {MODES.map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setMessage(null);
            }}
            className={cn(
              "flex-1 rounded px-2 py-1.5 text-sm transition-colors",
              mode === m ? "bg-bg text-ink shadow-sm" : "text-muted hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "file" && (
        <div className="flex flex-col gap-1">
          <input
            ref={fileInput}
            type="file"
            accept={UPLOAD_ACCEPT}
            aria-label="Choose a file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-ink file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-2.5 file:py-1.5 file:text-sm file:text-ink"
          />
          <p className={cn("text-xs", tooBig ? "text-destructive" : "text-muted")}>
            {tooBig
              ? `That file is over ${MAX_UPLOAD_MB} MB.`
              : `PDF, Word, Markdown, text or CSV, up to ${MAX_UPLOAD_MB} MB. Uploading a file with the same name replaces it.`}
          </p>
        </div>
      )}

      {mode === "text" && (
        <>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" aria-label="Title" className={field} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Notes, a decision, anything Sazed should be able to find later"
            aria-label="Text"
            className={cn(field, "resize-y")}
          />
        </>
      )}

      {mode === "url" && (
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
          inputMode="url"
          placeholder="https://…"
          aria-label="URL"
          className={field}
        />
      )}

      <div className="flex gap-2">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          list="kb-categories"
          placeholder="Category (optional)"
          aria-label="Category"
          className={field}
        />
        <datalist id="kb-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Button size="sm" className="h-auto shrink-0 px-3" disabled={!ready} onClick={submit}>
          {busy ? "Adding…" : "Add"}
        </Button>
      </div>

      {busy && <p className="text-xs text-muted">Reading, summarizing and indexing. Large files take a minute.</p>}
      {message && (
        <p role="status" className={cn("text-sm", message.error ? "text-destructive" : "text-muted")}>
          {message.text}
        </p>
      )}
    </section>
  );
}
