import { Page, PageBody, PageHeader } from "@/components/system";
import { useShellStore } from "@/nav/shellFlag";
import { useNavStore } from "@/store/navStore";
import { DispatchLive } from "./DispatchLive";
import { DispatchRuns } from "./DispatchRuns";

export function DispatchRunsPage() {
  const hubs = useShellStore((s) => s.shell) === "hubs";
  const navDispatch = useNavStore((s) => s.read.agents);
  const dispatch = navDispatch?.kind === "dispatch" ? navDispatch.id : null;

  return (
    <Page>
      {!hubs && <PageHeader title="Dispatch runs" />}
      <PageBody className={dispatch ? "max-w-none" : undefined}>
        {dispatch ? (
          <DispatchLive
            plan={dispatch}
            onBack={() => useNavStore.getState().closeItem()}
            onOpenPlan={(slug) => useNavStore.getState().openItem({ kind: "plan", id: slug })}
          />
        ) : (
          <DispatchRuns onOpen={(plan) => useNavStore.getState().openItem({ kind: "dispatch", id: plan })} />
        )}
      </PageBody>
    </Page>
  );
}
