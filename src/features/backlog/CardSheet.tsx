import { useEffect, useState } from "react";

import { getBacklogItem, listBacklog, type BacklogItem } from "@/api/backlog";
import { errorText } from "@/api/homelab";
import type { ProjectCard } from "@/api/projects";
import { JobSheet } from "@/features/jobs/JobSheet";
import { backInHistory, withoutEntry } from "@/nav/history";
import type { ViewKey } from "@/nav/hubViews";
import { useNavStore } from "@/store/navStore";

import { BacklogSheet } from "./BacklogSheet";
import { isOpenStatus } from "./format";
import { backlogId } from "./stages";

/** Opens a card's sheet over the view it was tapped in. */
export function openCardSheet(card: ProjectCard) {
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

/** The sheet of the card opened over this view, if any: a backlog item or a worker job. */
export function CardSheet({ view, onChanged }: { view: ViewKey; onChanged: () => void }) {
  const ref = useNavStore((s) => s.sheet[view]);
  const itemId = ref?.kind === "backlog" ? ref.id : null;
  const [item, setItem] = useState<BacklogItem | null>(null);
  const [rankedCount, setRankedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) return;
    let live = true;
    setError(null);
    Promise.all([getBacklogItem(itemId), listBacklog("open", undefined, 500)])
      .then(([found, open]) => {
        if (!live) return;
        setItem(found);
        setRankedCount(open.filter((i) => i.rank != null && isOpenStatus(i.status)).length);
      })
      .catch((err) => live && setError(errorText(err)));
    return () => {
      live = false;
    };
  }, [itemId]);

  const shown = item && item.id === itemId ? item : null;

  return (
    <>
      <BacklogSheet
        item={shown}
        rankedCount={rankedCount}
        onClose={close}
        onChanged={(updated) => {
          setItem((cur) => (cur?.id === updated.id ? updated : cur));
          onChanged();
        }}
        onOpenJob={openJob}
      />
      {itemId && error && !shown && (
        <p role="alert" className="text-meta text-err">
          Couldn't open the card: {error}
        </p>
      )}
      <JobSheet jobId={ref?.kind === "job" ? ref.id : null} onClose={close} onChanged={onChanged} onOpenJob={openJob} />
    </>
  );
}
