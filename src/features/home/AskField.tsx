import { useState } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  onSend: (text: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

/** Home's ask field in the desktop left column; the phone docks the shell's composer instead. */
export function AskField({ onSend, isStreaming, onStop }: Props) {
  const [text, setText] = useState("");
  const ready = text.trim() !== "" && !isStreaming;
  return (
    <form
      className="flex items-center gap-2 rounded-[10px] border border-line bg-surface py-1.5 pr-1.5 pl-3.5 focus-within:border-primary"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        onSend(text.trim());
        setText("");
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Ask Sazed"
        placeholder="Describe a task, or ask Sazed anything"
        className="h-7 min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-muted"
      />
      {isStreaming ? (
        <Button type="button" size="sm" variant="outline" onClick={onStop} aria-label="Stop generating">
          Stop
        </Button>
      ) : (
        <Button type="submit" size="sm" variant="outline" disabled={!ready}>
          Ask
        </Button>
      )}
    </form>
  );
}
