import { useEffect, useState } from "react";

import { EmptyState, Page, PageBody, PageHeader, Segmented } from "@/components/system";
import { errorText } from "@/api/homelab";
import { listPlans, type PlanState, type PlanSummary } from "@/api/plans";
import { useNavStore } from "@/store/navStore";
import { useUiStore } from "@/store/uiStore";
import { CompareView } from "./CompareView";
import { PlanList } from "./PlanList";
import { PlanView } from "./PlanView";
import { DispatchLive } from "./DispatchLive";
import { DispatchRuns } from "./DispatchRuns";

type Filter = PlanState | "all";

const FILTERS = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
] as const;

type Mode = "plans" | "dispatch";

type Open = { slug: string; version: number | null; compare: [number, number] | null };

export function PlansPage() {
  const [open, setOpen] = useState<Open | null>(() => {
    const linked = useUiStore.getState().linkedPlan;
    return linked ? { ...linked, compare: null } : null;
  });
  const [dispatch, setDispatch] = useState<string | null>(() => useUiStore.getState().linkedDispatchPlan);
  // The tab is the nav view: work:plans is Plans, agents:runs is Dispatch runs.
  const mode = useNavStore((s): Mode => (s.hub === "agents" ? "dispatch" : "plans"));
  const [filter, setFilter] = useState<Filter>("active");
  const [plans, setPlans] = useState<PlanSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const linkedPlan = useUiStore((s) => s.linkedPlan);
  const linkedDispatch = useUiStore((s) => s.linkedDispatchPlan);

  // Links can arrive while the page is mounted (the palette's Recent, a project's Plans list), so
  // react to each one rather than reading it once, and clear it so it never fires again later.
  useEffect(() => {
    if (!linkedPlan) return;
    setOpen({ ...linkedPlan, compare: null });
    useUiStore.getState().setLinkedPlan(null);
  }, [linkedPlan]);

  useEffect(() => {
    if (!linkedDispatch) return;
    setDispatch(linkedDispatch);
    useUiStore.getState().setLinkedDispatchPlan(null);
  }, [linkedDispatch]);

  function setMode(next: Mode) {
    useUiStore.getState().openView(next === "dispatch" ? { hub: "agents", view: "runs" } : { hub: "work", view: "plans" });
  }

  useEffect(() => {
    if (open || mode !== "plans") return;
    let live = true;
    setPlans(null);
    listPlans(filter === "all" ? {} : { state: filter })
      .then((p) => live && (setPlans(p), setError(null)))
      .catch((err) => live && setError(errorText(err)));
    return () => {
      live = false;
    };
  }, [filter, open, mode]);

  const modeSwitch = (
    <Segmented
      label="Plans view"
      options={[
        { value: "plans", label: "Plans" },
        { value: "dispatch", label: "Dispatch runs" },
      ]}
      value={mode}
      onChange={setMode}
      className="self-start"
    />
  );

  return (
    <Page>
      <PageHeader title="Plans" />
      <PageBody className={mode === "dispatch" && dispatch ? "max-w-none" : undefined}>
        {mode === "dispatch" && dispatch ? (
          <DispatchLive
            plan={dispatch}
            onBack={() => setDispatch(null)}
            onOpenPlan={(slug) => useUiStore.getState().setLinkedPlan({ slug, version: null })}
          />
        ) : mode === "dispatch" ? (
          <>
            {modeSwitch}
            <DispatchRuns onOpen={setDispatch} />
          </>
        ) : open?.compare ? (
          <CompareView
            slug={open.slug}
            a={open.compare[0]}
            b={open.compare[1]}
            onBack={() => setOpen({ ...open, compare: null })}
          />
        ) : open ? (
          <PlanView
            slug={open.slug}
            version={open.version}
            onBack={() => setOpen(null)}
            onView={(version) => setOpen({ ...open, version })}
            onCompare={(a, b) => setOpen({ ...open, compare: [a, b] })}
          />
        ) : (
          <>
            {modeSwitch}
            <Segmented
              label="Plan state"
              options={[...FILTERS]}
              value={filter}
              onChange={setFilter}
              className="self-start"
            />
            {error && <p className="text-meta text-err">Couldn't load plans: {error}</p>}
            {plans ? (
              plans.length === 0 ? (
                <EmptyState title="No plans here">Plans are versioned documents that cards are filed under.</EmptyState>
              ) : (
                <PlanList plans={plans} onOpen={(p) => setOpen({ slug: p.slug, version: null, compare: null })} />
              )
            ) : (
              !error && <p className="text-meta text-muted">Loading…</p>
            )}
          </>
        )}
      </PageBody>
    </Page>
  );
}
