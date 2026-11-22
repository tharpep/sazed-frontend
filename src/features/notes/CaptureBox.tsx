import { useLayoutEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, Square } from "lucide-react";

import { errorText } from "@/api/homelab";
import { captureNote } from "@/api/notes";
import { Button } from "@/components/ui/button";
import { useDictation } from "@/hooks/useDictation";

interface Props {
  onCaptured: () => void;
}

export function CaptureBox({ onCaptured }: Props) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const dictation = useDictation({
    onText: (spoken) => setText((t) => (t.trim() ? `${t.trimEnd()} ${spoken}` : spoken)),
  });
  const recording = dictation.state === "recording";
  const transcribing = dictation.state === "transcribing";
  const ready = text.trim() !== "" && !sending && !recording && !transcribing;

  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  async function send() {
    if (!ready) return;
    setSending(true);
    setFocused(false);
    setError(null);
    try {
      await captureNote(text.trim());
      setText("");
      onCaptured();
    } catch (err) {
      setError(`Couldn't save the note: ${errorText(err)}`);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || !(e.ctrlKey || e.metaKey) || e.nativeEvent.isComposing) return;
    e.preventDefault();
    send();
  }

  return (
    <section aria-label="New note" className="flex flex-col gap-1.5">
      <div className="flex min-h-12 items-end gap-1.5 rounded-[12px] border border-line bg-surface py-0.5 pr-1.5 pl-3 focus-within:border-primary">
        <textarea
          ref={textarea}
          rows={1}
          value={text}
          disabled={sending}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Type a note, paste a link"
          aria-label="Note"
          className="max-h-[50dvh] min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-base text-ink outline-none placeholder:text-muted disabled:opacity-60 sm:py-3 sm:text-body"
        />
        {(focused || text !== "") && (
          <div className="flex min-h-11 items-center">
            <Button className="min-h-11 sm:min-h-0" disabled={!ready} onClick={send}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        )}
        {dictation.supported && (
          <div className="flex min-h-11 items-center">
            <Button
              variant="ghost"
              className="min-h-11 min-w-11 aria-pressed:text-err sm:min-h-0 sm:min-w-8"
              disabled={sending || transcribing}
              aria-pressed={recording}
              aria-label={recording ? "Stop dictating" : transcribing ? "Transcribing" : "Dictate"}
              onClick={dictation.toggle}
            >
              {recording ? <Square fill="currentColor" /> : transcribing ? <LoaderCircle className="animate-spin" /> : <Mic />}
              {recording ? "Recording" : transcribing ? "Transcribing" : null}
            </Button>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-meta text-destructive">
          {error}
        </p>
      )}
      {dictation.error && (
        <p role="alert" className="text-meta text-destructive">
          {dictation.error}
        </p>
      )}
      <p className="text-caption text-muted">No folder, kind or tag to pick.</p>
    </section>
  );
}
