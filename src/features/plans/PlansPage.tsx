import { useEffect, useState } from "react";

import { EmptyState, Page, PageBody, PageHeader, Segmented } from "@/components/system";
import { errorText } from "@/api/homelab";
import { listPlans, type PlanState, type PlanSummary } from "@/api/plans";
import { useUiStore } from "@/store/uiStore";
import { CompareView } from "./CompareView";
import { PlanList } from "./PlanList";
import { PlanView } from "./PlanView";

type Filter = PlanState | "all";

const FILTERS = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
] as const;

type Open = { slug: string; version: number | null; compare: [number, number] | null };

export function PlansPage() {
  const [open, setOpen] = useState<Open | null>(() => {
    const linked = useUiStore.getState().linkedPlan;
    return linked ? { ...linked, compare: null } : null;
  });
  const [filter, setFilter] = useState<Filter>("active");
  const [plans, setPlans] = useState<PlanSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    useUiStore.getState().setLinkedPlan(null);
  }, []);

  useEffect(() => {
    if (open) return;
    let live = true;
    setPlans(null);
    listPlans(filter === "all" ? {} : { state: filter })
      .then((p) => live && (setPlans(p), setError(null)))
      .catch((err) => live && setError(errorText(err)));
    return () => {
      live = false;
    };
  }, [filter, open]);

  return (
    <Page>
      <PageHeader title="Plans" />
      <PageBody>
        {open?.compare ? (
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
