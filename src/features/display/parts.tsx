import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AudioLines, Check, Keyboard, Loader2, Mic, Repeat, Volume2, VolumeX, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { WidgetRenderer } from "@/widgets/WidgetRenderer";
import type { Chip, Item, Tone } from "./items";
import type { Exchange, Phase, useVoice } from "./useVoice";

const TONE_TEXT: Record<Tone, string> = { normal: "", attention: "text-warn", problem: "text-err" };

export function Chips({ chips, small = false }: { chips: Chip[]; small?: boolean }) {
  return (
    <div className={cn("flex flex-wrap", small ? "gap-1.5" : "gap-2")}>
      {chips.map((c) => (
        <span
          key={c.key}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface text-ink-2",
            small ? "px-2.5 py-0.5 text-[12px]" : "px-3 py-1 text-[14px]",
            TONE_TEXT[c.tone]
          )}
        >
          {c.tone !== "normal" && (
            <i className={cn("size-2 rounded-full", c.tone === "attention" ? "bg-warn" : "bg-err")} aria-hidden="true" />
          )}
          {c.label}
        </span>
      ))}
    </div>
  );
}

/** Hides every `[data-fit]` line that would be cut off at the bottom, so a card shows whole rows
 * only, however tall its box is. */
function useFit(ref: React.RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const fit = () => {
      const lines = [...box.querySelectorAll<HTMLElement>("[data-fit]")];
      lines.forEach((l) => (l.style.visibility = ""));
      const bottom = box.getBoundingClientRect().bottom;
      let full = false;
      for (const l of lines) {
        full ||= l.getBoundingClientRect().bottom > bottom + 0.5;
        if (full) l.style.visibility = "hidden";
      }
      lines.forEach((l, i) => {
        const next = lines[i + 1];
        if (l.dataset.fit === "label" && (!next || next.style.visibility === "hidden")) l.style.visibility = "hidden";
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  });
}

export function Card({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  const body = useRef<HTMLDivElement>(null);
  useFit(body);
  return (
    <section
      aria-label={title}
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-line bg-surface px-5 pb-4 pt-4", className)}
    >
      <h2 className="mb-1 truncate text-[14px] font-normal text-muted">{title}</h2>
      <div ref={body} className="min-h-0 flex-1 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

export function Row({ item, size = "md" }: { item: Item; size?: "sm" | "md" }) {
  const timeLike = /\d/.test(item.when);
  return (
    <div
      data-fit
      className={cn(
        "grid items-baseline gap-3 border-t border-line first:border-t-0",
        size === "md" ? "grid-cols-[6.25rem_minmax(0,1fr)_auto] py-2.5" : "grid-cols-[3.5rem_minmax(0,1fr)] gap-2 py-1.5"
      )}
    >
      <span
        className={cn(
          "truncate text-ink-2",
          size === "md" ? "text-[15px]" : "text-[13px]",
          timeLike && "font-mono tabular-nums",
          TONE_TEXT[item.tone]
        )}
      >
        {item.when}
      </span>
      <span className={cn("line-clamp-2 text-ink", size === "md" ? "text-[18px] leading-6" : "text-[14px] leading-[19px]")}>
        {item.title}
      </span>
      {size === "md" && item.meta && <span className="text-[14px] text-muted">{item.meta}</span>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p data-fit className="py-2.5 text-[18px] leading-6 text-ink-2">{children}</p>;
}

const RETURN_MS = 60_000;

/** One card at a time with dots, swiped sideways. It rests on the first card and slides back
 * there a minute after the last touch, so what you glance for is where you left it. */
export function Carousel({ cards }: { cards: { key: string; node: ReactNode }[] }) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const current = Math.min(index, cards.length - 1);

  useEffect(() => {
    if (current === 0) return;
    const id = setTimeout(() => setIndex(0), RETURN_MS);
    return () => clearTimeout(id);
  }, [current]);

  function go(i: number) {
    setIndex((i + cards.length) % cards.length);
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      onPointerDown={(e) => {
        startX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 48) go(current + (dx < 0 ? 1 : -1));
      }}
      style={{ touchAction: "pan-y" }}
    >
      <div className="min-h-0 flex-1 [&>*]:h-full [&>section]:pb-9">{cards[current].node}</div>
      <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-0.5" role="tablist" aria-label="Cards">
        {cards.map((c, i) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-label={c.key}
            onClick={() => go(i)}
            className="grid size-6 place-items-center"
          >
            <i className={cn("size-[7px] rounded-full", i === current ? "bg-ink-2" : "bg-line")} />
          </button>
        ))}
      </div>
    </div>
  );
}

const md = {
  p: ({ children }: { children?: ReactNode }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: ReactNode }) => <ul className="mb-3 list-disc space-y-1 pl-6 last:mb-0">{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className="mb-3 list-decimal space-y-1 pl-6 last:mb-0">{children}</ol>,
  strong: ({ children }: { children?: ReactNode }) => <strong className="font-semibold text-ink">{children}</strong>,
  a: ({ children }: { children?: ReactNode }) => <span className="text-primary">{children}</span>,
  code: ({ children }: { children?: ReactNode }) => <code className="font-mono text-[0.9em]">{children}</code>,
};

export function AnswerCard({ exchange, phase, onDone }: { exchange: Exchange; phase: Phase; onDone: () => void }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [exchange.answer, exchange.tools.length, exchange.uiBlocks.length]);

  const waiting = phase === "thinking" && !exchange.answer;
  return (
    <section aria-label="Sazed's answer" className="relative flex h-full min-h-0 flex-col rounded-[14px] border border-line bg-surface">
      {phase === "idle" && (
        <button
          type="button"
          onClick={onDone}
          aria-label="Close the answer"
          className="absolute right-2 top-2 grid size-10 place-items-center rounded-full text-muted hover:bg-raised"
        >
          <X className="size-5" />
        </button>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="mb-3 pr-8 text-[18px] leading-6 text-ink-2">“{exchange.question}”</p>
        {exchange.tools.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {exchange.tools.map((t, i) => (
              <span
                key={`${t.name}-${i}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-[13px] text-muted",
                  t.status === "error" && "text-err"
                )}
              >
                {t.done ? <Check className="size-3.5" /> : <Loader2 className="size-3.5 animate-spin" />}
                {t.label}
              </span>
            ))}
          </div>
        )}
        {exchange.uiBlocks.map((b, i) => (
          <div key={i} className="mb-3">
            <WidgetRenderer name={b.component} props={b.props} />
          </div>
        ))}
        {waiting && <p className="animate-pulse text-[18px] text-muted">Thinking…</p>}
        {exchange.answer && (
          <div className="text-[20px] leading-[29px] text-ink">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
              {exchange.answer}
            </ReactMarkdown>
          </div>
        )}
        {exchange.error && <p className="text-[18px] text-err">Couldn't reach Sazed: {exchange.error}</p>}
        <div ref={end} />
      </div>
    </section>
  );
}

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Ask Sazed",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking · tap to stop",
};

function RoundButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-2 transition-colors",
        active && "border-primary text-primary"
      )}
    >
      {children}
    </button>
  );
}

/** Mic first: the kiosk is spoken to. Typing, mute and conversation mode sit beside it. */
export function AskBar({ voice }: { voice: ReturnType<typeof useVoice> }) {
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const live = voice.phase !== "idle";

  function submit(e: FormEvent) {
    e.preventDefault();
    voice.ask(text);
    setText("");
    setTyping(false);
  }

  if (typing) {
    return (
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setTyping(false)}
          placeholder="Ask Sazed"
          aria-label="Ask Sazed"
          className="h-12 min-w-0 flex-1 rounded-full border border-line bg-surface px-5 text-[17px] text-ink outline-none placeholder:text-muted focus:border-primary"
        />
        {voice.voices.length > 1 && !voice.muted && (
          <select
            value={voice.voiceUri}
            onChange={(e) => voice.chooseVoice(e.target.value)}
            aria-label="Voice"
            className="h-12 max-w-32 rounded-full border border-line bg-surface px-3 text-[14px] text-ink-2"
          >
            {voice.voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
              </option>
            ))}
          </select>
        )}
        <RoundButton label="Cancel typing" onClick={() => setTyping(false)}>
          <X className="size-5" />
        </RoundButton>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      {voice.exchange ? (
        <RoundButton label="Conversation mode" onClick={voice.toggleConversation} active={voice.conversation}>
          <Repeat className="size-5" />
        </RoundButton>
      ) : (
        <RoundButton label="Type a question" onClick={() => setTyping(true)}>
          <Keyboard className="size-5" />
        </RoundButton>
      )}
      <button
        type="button"
        onClick={voice.canListen ? voice.tapMic : () => setTyping(true)}
        disabled={voice.phase === "thinking"}
        className={cn(
          "flex h-14 min-w-0 flex-1 items-center justify-center gap-2.5 rounded-full border border-line bg-surface px-5 text-[17px] text-ink-2 transition-colors",
          live && "border-primary bg-[color-mix(in_oklab,var(--color-primary)_22%,var(--color-surface))] text-ink"
        )}
      >
        {voice.phase === "speaking" ? (
          <AudioLines className="size-6 text-primary" />
        ) : voice.phase === "thinking" ? (
          <Loader2 className="size-6 animate-spin text-primary" />
        ) : (
          <Mic className={cn("size-6 text-primary", voice.phase === "listening" && "animate-pulse")} />
        )}
        <span className="truncate">{voice.canListen ? PHASE_LABEL[voice.phase] : "Type to ask Sazed"}</span>
      </button>
      <RoundButton label={voice.muted ? "Unmute spoken answers" : "Mute spoken answers"} onClick={voice.toggleMute} active={voice.muted}>
        {voice.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </RoundButton>
    </div>
  );
}
