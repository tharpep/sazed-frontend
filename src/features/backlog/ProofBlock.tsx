import type { PrSnapshot } from "@/api/projects";
import { cn } from "@/lib/utils";

import { oldSnapshotText, proofLines, type Mark } from "./proof";

const GLYPH: Record<Mark, string> = { done: "✓", bad: "✕", wait: "○" };
const GLYPH_TONE: Record<Mark, string> = { done: "text-ok", bad: "text-err", wait: "text-muted" };
// The link covers its whole row, so the row is the tap target.
const LINK = "text-primary after:absolute after:inset-0 after:content-[''] hover:underline";
const GLYPH_WORD: Record<Mark, string> = { done: "Done:", bad: "Problem:", wait: "Waiting:" };

/** A card's PR, checks and review from Sazed's snapshot, with Sazed's reason the card waits. */
export function ProofBlock({ pr, reason }: { pr: PrSnapshot; reason: string }) {
  const old = oldSnapshotText(pr);
  return (
    <section aria-label="Proof" className="flex flex-col gap-1.5">
      <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-ink">
        Proof
        {!pr.fetched_at && <span className="text-caption font-normal text-muted">not fetched from GitHub yet</span>}
        {old && <span className="text-caption font-normal text-warn">snapshot {old}</span>}
      </h3>
      {reason && <p className="text-meta text-ink-2">{reason}</p>}
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {proofLines(pr).map((line) => (
          <li key={line.key} className="relative grid min-h-11 grid-cols-[18px_minmax(0,1fr)_auto] items-baseline gap-x-2.5 px-3 py-2.5 has-[a]:hover:bg-raised sm:min-h-0">
            <span aria-hidden="true" className={cn("text-center text-meta", GLYPH_TONE[line.mark])}>
              {GLYPH[line.mark]}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-body text-ink">
                <span className="sr-only">{GLYPH_WORD[line.mark]} </span>
                {line.key === "pr" ? (
                  <a href={pr.url} target="_blank" rel="noreferrer" className={LINK}>
                    {line.title}
                  </a>
                ) : line.key === "review" && pr.review ? (
                  <a href={pr.review.url} target="_blank" rel="noreferrer" className={LINK}>
                    {line.title}
                  </a>
                ) : (
                  line.title
                )}
              </span>
              {line.detail && <span className="text-caption [overflow-wrap:anywhere] text-muted">{line.detail}</span>}
            </span>
            <span className="font-mono text-caption whitespace-nowrap text-ink-2 tabular-nums">{line.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
