import { useEffect, useState } from "react";

import { EmptyState, Page, PageBody, PageHeader, Segmented } from "@/components/system";
import { errorText } from "@/api/homelab";
import { listPlans, type PlanState, type PlanSummary } from "@/api/plans";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { ViewPicker } from "@/components/shell/ViewPicker";
import { useShellStore } from "@/nav/shellFlag";
import { useNavStore } from "@/store/navStore";
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
  const hubs = useShellStore((s) => s.shell) === "hubs";
  const navPlan = useNavStore((s) => s.read.work);
  const openRef = navPlan?.kind === "plan" ? navPlan : null;
  const open: Open | null = openRef
    ? { slug: openRef.id, version: openRef.version ?? null, compare: null }
    : null;
  const [compare, setCompare] = useState<[number, number] | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [plans, setPlans] = useState<PlanSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      {!hubs && <PageHeader title="Plans" />}
      <PageBody>
        {compare ? (
          <CompareView
            slug={open!.slug}
            a={compare[0]}
            b={compare[1]}
            onBack={() => setCompare(null)}
          />
        ) : open ? (
          <PlanView
            slug={open.slug}
            version={open.version}
            onBack={() => {
              setCompare(null);
              useNavStore.getState().closeItem();
            }}
            onView={(version) => useNavStore.getState().openItem({ kind: "plan", id: open.slug, ...(version !== null && { version }) })}
            onCompare={(a, b) => setCompare([a, b])}
          />
        ) : (
          <>
            {hubs ? (
              <ToolsRow
                picker={
                  <ViewPicker
                    title="Plan state"
                    choices={FILTERS.map(({ value, label }) => ({ id: value, label }))}
                    value={filter}
                    onChange={(id) => setFilter(id as Filter)}
                  />
                }
              />
            ) : (
              <Segmented
                label="Plan state"
                options={[...FILTERS]}
                value={filter}
                onChange={setFilter}
                className="self-start"
              />
            )}
            {error && <p className="text-meta text-err">Couldn't load plans: {error}</p>}
            {plans ? (
              plans.length === 0 ? (
                <EmptyState title="No plans here">Plans are versioned documents that cards are filed under.</EmptyState>
              ) : (
                <PlanList plans={plans} onOpen={(p) => useNavStore.getState().openItem({ kind: "plan", id: p.slug })} />
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
