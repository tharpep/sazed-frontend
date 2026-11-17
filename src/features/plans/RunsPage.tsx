import { useState } from "react";

import { Page, PageBody } from "@/components/system";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { JobsPanel } from "@/features/jobs/JobsPanel";
import { useNavStore } from "@/store/navStore";
import { DispatchLive } from "./DispatchLive";
import { DispatchRuns } from "./DispatchRuns";

function startJob(setStarting: (starting: boolean) => void) {
  useNavStore.getState().closeItem("job");
  setStarting(true);
}

export function RunsPage() {
  const navRead = useNavStore((s) => s.read.agents);
  const dispatch = navRead?.kind === "dispatch" ? navRead.id : null;
  const [starting, setStarting] = useState(false);

  return (
    <Page>
      <PageBody className={dispatch ? "max-w-none" : undefined}>
        {dispatch ? (
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
