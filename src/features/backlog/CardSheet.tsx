import { useEffect, useState } from "react";

import { getBacklogItem, listBacklog, type BacklogItem } from "@/api/backlog";
import { errorText } from "@/api/homelab";
import type { ProjectCard } from "@/api/projects";
import type { Session } from "@/api/sessions";
import { JobSheet } from "@/features/jobs/JobSheet";
import { backInHistory, withoutEntry } from "@/nav/history";
import type { ViewKey } from "@/nav/hubViews";
import { useNavStore } from "@/store/navStore";

import { BacklogSheet } from "./BacklogSheet";
import { isOpenStatus } from "./format";
import { backlogId } from "./stages";

const FAILURE_SHOWN_MS = 8000;

/** Opens a card's sheet over the view it was tapped in. */
export function openCardSheet(card: Pick<ProjectCard, "id" | "job_id"> & { kind: string }) {
  const id = card.kind === "job" ? card.job_id : backlogId(card);
  if (id) useNavStore.getState().openSheet({ kind: card.kind === "job" ? "job" : "backlog", id });
}

function close() {
  backInHistory(() => useNavStore.getState().closeSheet());
}

// Moving from a card to its job swaps the sheet in place, so closing the job lands on the page.
function openJob(id: string) {
  withoutEntry(() => useNavStore.getState().openSheet({ kind: "job", id }));
}

/** The sheet of the card opened over this view, if any: a backlog item or a worker job. `cards`
 * are the board cards the page already holds, which carry each card's PR snapshot. */
export function CardSheet({
  view,
  cards,
  sessions,
  onChanged,
}: {
  view: ViewKey;
  cards: readonly ProjectCard[] | null;
  /** Live sessions from the command poll, where the page has one: fresher than `cards`. */
  sessions?: readonly Session[];
  onChanged: () => void;
}) {
  const ref = useNavStore((s) => s.sheet[view]);
  const itemId = ref?.kind === "backlog" ? ref.id : null;
  const card = itemId ? (cards?.find((c) => backlogId(c) === itemId) ?? null) : null;
  const live = itemId ? (sessions?.find((s) => s.card && (s.card.id === `item:${itemId}` || s.card.id === itemId)) ?? null) : null;
  const [item, setItem] = useState<BacklogItem | null>(null);
  const [rankedCount, setRankedCount] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) return;
    let live = true;
    setFailure(null);
    getBacklogItem(itemId).then(
      (found) => live && setItem(found),
      (err) => {
        if (!live) return;
        setFailure(`Couldn't open the card: ${errorText(err)}`);
        // Takes back the history entry the tap pushed, so Back still leaves the page and the same
        // card can be tapped again.
        close();
      }
    );
    // Only the Priority row's "of N" and its last-place check use this, so it never holds the sheet.
    listBacklog("open", undefined, 500).then(
      (open) => live && setRankedCount(open.filter((i) => i.rank != null && isOpenStatus(i.status)).length),
      () => undefined
    );
    return () => {
      live = false;
    };
  }, [itemId]);

  useEffect(() => {
    if (!failure) return;
    const id = setTimeout(() => setFailure(null), FAILURE_SHOWN_MS);
    return () => clearTimeout(id);
  }, [failure]);

  const shown = item && item.id === itemId ? item : null;

  return (
    <>
      <BacklogSheet
        item={shown}
        card={card}
        liveSessionId={live?.session_id ?? null}
        loading={itemId !== null && !shown}
        rankedCount={rankedCount}
        onClose={close}
        onChanged={(updated) => {
          setItem((cur) => (cur?.id === updated.id ? updated : cur));
          onChanged();
        }}
        onOpenJob={openJob}
      />
      <JobSheet jobId={ref?.kind === "job" ? ref.id : null} onClose={close} onChanged={onChanged} onOpenJob={openJob} />
      {failure && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-err/40 bg-surface py-1 pr-1 pl-3.5 text-meta text-ink shadow-lg sm:bottom-6"
        >
          <span className="min-w-0 flex-1">{failure}</span>
          <button
            type="button"
            onClick={() => setFailure(null)}
            className="min-h-11 shrink-0 rounded-md px-3 text-muted hover:bg-raised hover:text-ink sm:min-h-8"
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
