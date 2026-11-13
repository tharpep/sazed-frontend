import { Page, PageBody, PageHeader } from "@/components/system";
import { useShellStore } from "@/nav/shellFlag";
import { useNavStore } from "@/store/navStore";
import { DispatchLive } from "./DispatchLive";
import { DispatchRuns } from "./DispatchRuns";
import { JobsPanel } from "@/features/jobs/JobsPanel";

export function RunsPage() {
  const hubs = useShellStore((s) => s.shell) === "hubs";
  const navDispatch = useNavStore((s) => s.read.agents);
  const dispatch = navDispatch?.kind === "dispatch" ? navDispatch.id : null;

  return (
    <Page>
      {!hubs && <PageHeader title="Runs" />}
      <PageBody className={dispatch ? "max-w-none" : undefined}>
        {dispatch ? (
          <DispatchLive
            plan={dispatch}
            onBack={() => useNavStore.getState().closeItem()}
            onOpenPlan={(slug) => useNavStore.getState().openItem({ kind: "plan", id: slug })}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <section aria-label="Worker jobs">
              <h2 className="mb-2 px-1 text-sm font-medium text-ink">Worker jobs</h2>
              <JobsPanel refreshKey={0} grouped startInPanel />
            </section>
            <section aria-label="Dispatch runs">
              <h2 className="mb-2 px-1 text-sm font-medium text-ink">Dispatch runs</h2>
              <DispatchRuns onOpen={(plan) => useNavStore.getState().openItem({ kind: "dispatch", id: plan })} />
            </section>
          </div>
        )}
      </PageBody>
    </Page>
  );
}
