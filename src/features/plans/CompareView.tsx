import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { errorText } from "@/api/homelab";
import { getPlanDiff, type DiffBlock, type PlanDiff, type PlanVersion } from "@/api/plans";
import { Author } from "./planParts";

function VersionLine({ meta }: { meta: PlanVersion }) {
  return (
    <span className="min-w-0 text-meta text-ink-2">
      <b className="font-medium text-ink">v{meta.version}</b> · <Author name={meta.author} /> · “{meta.reason}”
    </span>
  );
}

function Block({ block }: { block: DiffBlock }) {
  if (block.kind === "same") {
    return (
      <p className="text-center text-caption text-muted">
        · · · {block.count} unchanged {block.count === 1 ? "block" : "blocks"}
        {block.headings.length > 0 && ` (${block.headings.join(", ")})`} · · ·
      </p>
    );
  }
  const base = "whitespace-pre-wrap rounded-sm border-l-[3px] px-2.5 py-1.5 text-body [overflow-wrap:anywhere]";
  if (block.kind !== "chg") {
    const tone = block.kind === "add" ? "border-ok bg-ok/14 text-ink-2" : "border-err bg-err/12 text-muted line-through";
    return <div className={cn(base, tone)}>{block.text}</div>;
  }
  return (
    <div className={cn(base, "border-warn bg-surface text-ink-2")}>
      {block.segments.map((seg, i) =>
        seg.op === "add" ? (
          <ins key={i} className="rounded-sm bg-ok/14 px-0.5 text-ink no-underline">
            {seg.text}
          </ins>
        ) : seg.op === "del" ? (
          <del key={i} className="rounded-sm bg-err/12 px-0.5 text-muted">
            {seg.text}
          </del>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </div>
  );
}

export function CompareView({ slug, a, b, onBack }: { slug: string; a: number; b: number; onBack: () => void }) {
  const [diff, setDiff] = useState<PlanDiff | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setDiff(null);
    getPlanDiff(slug, a, b)
      .then((d) => live && (setDiff(d), setError(null)))
      .catch((err) => live && setError(errorText(err)));
    return () => {
      live = false;
    };
  }, [slug, a, b]);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex items-center gap-1 self-start rounded-md px-1 py-0.5 text-meta text-ink-2 transition-colors hover:bg-raised hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Plan
      </button>
      {error && <p className="text-meta text-err">Couldn't load the comparison: {error}</p>}
      {!diff && !error && <p className="text-meta text-muted">Loading…</p>}
      {diff && (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3">
            <VersionLine meta={diff.from} />
            <span className="text-muted" aria-hidden="true">
              →
            </span>
            <VersionLine meta={diff.to} />
            <span className="flex items-center gap-3.5 text-caption text-muted sm:ml-auto">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-3 rounded-sm border border-ok bg-ok/14" aria-hidden="true" />
                added
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-3 rounded-sm border border-err bg-err/12" aria-hidden="true" />
                removed
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-3 px-4 py-4 md:px-6">
            {diff.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
