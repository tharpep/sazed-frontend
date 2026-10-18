import { useState } from "react";

import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/api/activity";
import { iconFor, ms, statusDot, statusTone, usd } from "./format";

interface Props {
  event: ActivityEvent;
  depth: number;
  /** Waterfall geometry as fractions of the flow's span (0..1). */
  bar: { left: number; width: number };
  offsetMs: number;
  focused: boolean;
  onOpenSession: (id: string) => void;
}

const pre =
  "max-h-64 overflow-auto rounded-md border border-border bg-surface p-2 font-mono text-[11px] whitespace-pre-wrap break-words text-ink";

function asText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return JSON.stringify(v, null, 2);
}

function Field({ label, value }: { label: string; value: unknown }) {
  const text = asText(value);
  if (!text || text === "{}" || text === "null") return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <pre className={pre}>{text}</pre>
    </div>
  );
}

/** What's worth showing for each kind, in plain terms first and raw JSON last. */
function Detail({ event, onOpenSession }: { event: ActivityEvent; onOpenSession: (id: string) => void }) {
  const d = (event.detail ?? {}) as Record<string, unknown>;
  const meta = (d.meta ?? {}) as Record<string, unknown>;
  const prUrl = (d.pr_url as string) || (meta.pr_url as string) || (event.refs.pr_url as string);
  const session = event.refs.session;
  return (
    <div className="flex flex-col gap-2 pt-2 pb-1">
      {event.kind === "llm" && (
        <p className="text-xs text-muted">
          {[
            `${d.input_tokens ?? 0} in`,
            `${d.output_tokens ?? 0} out`,
            d.cache_read_tokens ? `${d.cache_read_tokens} cache read` : "",
            d.cache_write_tokens ? `${d.cache_write_tokens} cache write` : "",
            event.cost_usd != null ? usd(event.cost_usd) : "",
            d.purpose ? `purpose: ${d.purpose}` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {(event.kind === "chat.user" || event.kind === "chat.reply") && <Field label="Text" value={d.text} />}
      {event.kind === "tool" && (
        <>
          <Field label="Input" value={d.input} />
          <Field label="Output" value={d.output} />
          <Field label="Error" value={d.error} />
        </>
      )}
      {event.kind === "approval" && <Field label="Input" value={d.input} />}
      {event.kind === "automation" && (
        <>
          <Field label="Output" value={d.output} />
          <Field label="Error" value={d.error} />
        </>
      )}
      {event.kind.startsWith("job") && (
        <>
          <Field label="Result" value={d.result} />
          <Field label="Error" value={d.error} />
        </>
      )}
      {event.kind.startsWith("gw.") && <Field label="Details" value={d} />}
      {event.kind === "backlog" && <Field label="Details" value={d.summary ?? d.note} />}
      <div className="flex flex-wrap gap-2">
        {prUrl && (
          <a href={prUrl} target="_blank" rel="noreferrer" className="rounded-md border border-border px-2 py-1 text-xs text-primary hover:bg-surface">
            Open the PR
          </a>
        )}
        {session && (
          <button
            type="button"
            onClick={() => onOpenSession(session)}
            className="rounded-md border border-border px-2 py-1 text-xs text-primary hover:bg-surface"
          >
            Open the conversation
          </button>
        )}
      </div>
    </div>
  );
}

export function FlowRow({ event, depth, bar, offsetMs, focused, onOpenSession }: Props) {
  const [open, setOpen] = useState(focused);
  const Icon = iconFor(event.kind);
  const extra = [ms(event.duration_ms), event.kind === "llm" ? usd(event.cost_usd) : ""].filter(Boolean).join(" · ");
  return (
    <li className={cn("rounded-md", focused && "bg-surface/70")} style={{ paddingLeft: depth * 14 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-surface"
      >
        <span className={cn("size-1.5 shrink-0 rounded-full", statusDot(event.status))} aria-hidden="true" />
        <Icon className={cn("size-3.5 shrink-0", statusTone(event.status))} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-xs text-ink">{event.title}</span>
        <span className="hidden w-24 shrink-0 sm:block" aria-hidden="true">
          <span className="relative block h-1.5 rounded-full bg-surface">
            <span
              className={cn("absolute top-0 h-1.5 rounded-full", event.status === "error" ? "bg-destructive" : "bg-primary/60")}
              style={{ left: `${bar.left * 100}%`, width: `${Math.max(bar.width * 100, 2)}%` }}
            />
          </span>
        </span>
        <span className="w-24 shrink-0 text-right text-[11px] text-muted tabular-nums">
          +{ms(offsetMs) || "0ms"}
          {extra && <span className="block">{extra}</span>}
        </span>
      </button>
      {open && <Detail event={event} onOpenSession={onOpenSession} />}
    </li>
  );
}
