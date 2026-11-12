import { useState } from "react";

import { errorText } from "@/api/homelab";
import { runAction, type CardAction } from "@/api/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const QUIET = new Set<CardAction["id"]>(["stop", "decline"]);
const PLACEHOLDER: Record<string, string> = {
  answer: "Answer, and the same session resumes",
  steer: "New directions; the same session picks them up",
};
export const TOUCH_BUTTON = "max-sm:h-11 max-sm:min-w-[88px] max-sm:rounded-[9px] max-sm:px-3.5 max-sm:text-sm";

interface Props {
  cardId: string;
  actions: CardAction[];
  onDone: () => void;
  openText?: CardAction["id"] | null;
  className?: string;
  touch?: boolean;
}

export function CardActions({ cardId, actions, onDone, openText = null, className, touch = false }: Props) {
  const [typing, setTyping] = useState<CardAction["id"] | null>(openText);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: CardAction["id"], body = "") {
    setBusy(true);
    setError(null);
    try {
      await runAction(cardId, action, body);
      setText("");
      setTyping(openText);
      onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const buttons = actions.filter((a) => !(a.takes_text && typing === a.id));
  const textAction = actions.find((a) => a.id === typing);
  const size = touch ? TOUCH_BUTTON : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)} onClick={(e) => e.stopPropagation()}>
      {textAction && (
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length >= 2) run(textAction.id, text.trim());
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={textAction.label}
            placeholder={PLACEHOLDER[textAction.id]}
            className={cn(
              "min-w-0 flex-1 rounded-md border border-line bg-bg px-2 py-1 text-meta text-ink outline-none placeholder:text-muted focus-visible:border-primary",
              touch && "max-sm:h-11 max-sm:text-base"
            )}
          />
          <Button type="submit" size="sm" className={size} disabled={busy || text.trim().length < 2}>
            Send
          </Button>
        </form>
      )}
      {buttons.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {buttons.map((a, i) =>
            a.takes_text ? (
              <Button key={a.id} size="sm" variant="outline" className={size} disabled={busy} onClick={() => setTyping(a.id)}>
                {a.label}
              </Button>
            ) : (
              <Button
                key={a.id}
                size="sm"
                variant={QUIET.has(a.id) ? "ghost" : i === 0 ? "default" : "outline"}
                className={cn(QUIET.has(a.id) && "text-err hover:text-err", size)}
                disabled={busy}
                onClick={() => run(a.id)}
              >
                {a.label}
              </Button>
            )
          )}
        </div>
      )}
      {error && <p className="text-caption text-err">{error}</p>}
    </div>
  );
}
