import { useEffect, useState } from "react";

import { Page, PageBody } from "@/components/system";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { JobsPanel } from "@/features/jobs/JobsPanel";
import { useNavStore, type ItemRef } from "@/store/navStore";
import { DispatchLive } from "./DispatchLive";
import { DispatchRuns } from "./DispatchRuns";

function startJob(setStarting: (starting: boolean) => void) {
  useNavStore.getState().closeItem("job");
  setStarting(true);
}

/** Which of an open job and an open dispatch run Runs shows: the one picked last, by Recent. */
export function newerRunsItem(recent: ItemRef[], job: string | null, dispatch: string | null): "job" | "dispatch" | null {
  if (!job || !dispatch) return job ? "job" : dispatch ? "dispatch" : null;
  const first = recent.find((r) => (r.kind === "job" && r.id === job) || (r.kind === "dispatch" && r.id === dispatch));
  return first?.kind === "job" ? "job" : "dispatch";
}

export function RunsPage() {
  const job = useNavStore((s) => (s.open["agents:runs"]?.kind === "job" ? s.open["agents:runs"].id : null));
  const dispatch = useNavStore((s) => (s.read["agents:runs"]?.kind === "dispatch" ? s.read["agents:runs"].id : null));
  const recent = useNavStore((s) => s.recent);
  const [starting, setStarting] = useState(false);
  const shown = newerRunsItem(recent, job, dispatch);

  // Plan Live covers the list, so a job and a dispatch run cannot both be open: the older pick
  // closes, and Back never brings it back.
  useEffect(() => {
    if (job && dispatch) useNavStore.getState().closeItem(shown === "job" ? "dispatch" : "job");
  }, [job, dispatch, shown]);

  return (
    <Page>
      <PageBody className={shown === "dispatch" ? "max-w-none" : undefined}>
        {shown === "dispatch" && dispatch ? (
          <DispatchLive
            plan={dispatch}
            onBack={() => useNavStore.getState().closeItem("dispatch")}
            onOpenPlan={(slug) => useNavStore.getState().openItem({ kind: "plan", id: slug })}
          />
        ) : (
          <>
            <ToolsRow action={{ label: "Start a job", onClick: () => startJob(setStarting) }} />
            <section aria-labelledby="runs-jobs" className="flex flex-col gap-2">
              <h2 id="runs-jobs" className="px-1 text-sm font-medium text-ink">
                Worker jobs
              </h2>
              <JobsPanel starting={starting} onStartingChange={setStarting} />
            </section>
            <section aria-labelledby="runs-dispatch" className="flex flex-col gap-2">
              <h2 id="runs-dispatch" className="px-1 text-sm font-medium text-ink">
                Dispatch runs
              </h2>
              <DispatchRuns onOpen={(plan) => useNavStore.getState().openItem({ kind: "dispatch", id: plan })} />
            </section>
          </>
        )}
      </PageBody>
    </Page>
  );
}
