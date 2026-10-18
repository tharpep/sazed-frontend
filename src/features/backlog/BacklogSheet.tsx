import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { approveBacklogItem, updateBacklogItem, type BacklogItem } from "@/api/backlog";
import { errorText } from "@/api/homelab";
import { REPOS, STATUS_LABEL, TYPE_LABEL, ageLabel, sourceLabel, workLabel } from "./format";

interface Props {
  item: BacklogItem | null;
  onClose: () => void;
  onChanged: (item: BacklogItem) => void;
  onOpenJob: (id: string) => void;
}

const field =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary";

export function BacklogSheet({ item, onClose, onChanged, onOpenJob }: Props) {
  const isMobile = useIsMobile();
  const [repo, setRepo] = useState("");
  const [note, setNote] = useState("");
  const [approving, setApproving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRepo(item?.repos[0] ?? "");
    setNote("");
    setApproving(false);
    setError(null);
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(fn: () => Promise<BacklogItem>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await fn();
      setApproving(false);
      onChanged(updated);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const isOpen = item?.status === "new" || item?.status === "shortlisted";
  const work = item ? workLabel(item) : null;
  const facts = item
    ? [
        TYPE_LABEL[item.type],
        item.effort && `effort ${item.effort}`,
        item.impact && `${item.impact} impact`,
        sourceLabel(item.source),
        ageLabel(item.created_at),
      ].filter(Boolean)
    : [];

  return (
    <Sheet open={item !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn("gap-0", isMobile ? "max-h-[90dvh]" : "w-full sm:max-w-xl")}
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="pr-8 text-base">{item?.title ?? "Item"}</SheetTitle>
          {item && (
            <p className="text-xs text-muted">
              <span className={cn(item.status === "shortlisted" && "text-accent")}>
                {STATUS_LABEL[item.status]}
                {item.rank ? ` #${item.rank}` : ""}
              </span>
              {" · "}
              {facts.join(" · ")}
            </p>
          )}
        </SheetHeader>

        {item && (
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {error && <p className="text-sm text-destructive">{error}</p>}

            {item.summary && (
              <section aria-label="What it is" className="prose-journal text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.summary}</ReactMarkdown>
              </section>
            )}
            {item.why && (
              <section aria-label="Why" className="flex flex-col gap-1">
                <h3 className="text-sm font-medium text-ink">Why</h3>
                <div className="prose-journal text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.why}</ReactMarkdown>
                </div>
              </section>
            )}
            {item.repos.length > 0 && (
              <p className="text-xs text-muted">Repos: {item.repos.join(", ")}</p>
            )}
            {item.sources.length > 0 && (
              <section aria-label="Sources" className="flex flex-col gap-1">
                <h3 className="text-sm font-medium text-ink">Sources</h3>
                <ul className="flex flex-col gap-1">
                  {item.sources.map((url) => (
                    <li key={url} className="min-w-0 truncate text-xs">
                      <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {url.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {item.note && <p className="text-sm text-muted">Your note: {item.note}</p>}

            {item.job_id && (
              <div className="flex flex-wrap items-center gap-2">
                {item.job_meta?.pr_url && (
                  <a
                    href={item.job_meta.pr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border px-3 py-1.5 text-sm text-primary hover:bg-surface"
                  >
                    Open PR #{item.job_meta.pr_number} on GitHub
                  </a>
                )}
                <Button size="sm" variant="outline" onClick={() => onOpenJob(item.job_id!)}>
                  Open the job
                </Button>
                {work && !item.job_meta?.pr_url && <span className="text-xs text-muted">{work}</span>}
              </div>
            )}

            {isOpen && approving && (
              <section aria-label="Approve" className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <label className="flex flex-col gap-1 text-sm text-ink">
                  Repo for the PR
                  <input
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    list="backlog-repos"
                    placeholder="e.g. tharpep/sazed"
                    className={field}
                  />
                  <datalist id="backlog-repos">
                    {[...new Set([...item.repos, ...REPOS])].map((r) => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </label>
                <label className="flex flex-col gap-1 text-sm text-ink">
                  Note for Claude Code (optional)
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Scope it down, pick an approach, things to avoid…"
                    className={cn(field, "resize-y")}
                  />
                </label>
                <p className="text-xs text-muted">
                  Claude Code starts now on a copy of the repo; the bot opens a PR you review and merge.
                </p>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setApproving(false)}>
                    Back
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy || !repo.trim()}
                    onClick={() => act(() => approveBacklogItem(item.id, repo.trim(), note))}
                  >
                    {busy ? "Starting…" : "Start the PR"}
                  </Button>
                </div>
              </section>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {isOpen && !approving && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => act(() => updateBacklogItem(item.id, { status: "dismissed" }))}
                  >
                    Dismiss
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => setApproving(true)}>
                    Approve
                  </Button>
                </>
              )}
              {item.status === "approved" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => act(() => updateBacklogItem(item.id, { status: "done" }))}
                >
                  Mark done
                </Button>
              )}
              {(item.status === "dismissed" || item.status === "stale" || item.status === "done") && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => act(() => updateBacklogItem(item.id, { status: "new" }))}
                >
                  Restore
                </Button>
              )}
            </div>
            {item.status === "dismissed" && (
              <p className="text-xs text-muted">
                Kept on record so the scout won't suggest it again.
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
