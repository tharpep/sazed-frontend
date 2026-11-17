import { useEffect, useState } from "react";

import { EmptyState, Page, PageBody } from "@/components/system";
import { errorText } from "@/api/homelab";
import { listPlans, type PlanSummary } from "@/api/plans";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { ViewPicker } from "@/components/shell/ViewPicker";
import { SUB_CHOICES, useNavStore, useSub } from "@/store/navStore";
import { CompareView } from "./CompareView";
import { PlanList } from "./PlanList";
import { PlanView } from "./PlanView";

const FILTER_LABEL = { active: "Active", draft: "Draft", done: "Done", all: "All" } as const;
const FILTER_CHOICES = SUB_CHOICES["work:plans"].map((id) => ({ id, label: FILTER_LABEL[id] }));

// Tied to the plan and version it was picked on, so another plan opened from a link or the
// palette never shows this one's comparison.
type Compare = { slug: string; version: number | null; a: number; b: number };

export function PlansPage() {
  const navPlan = useNavStore((s) => s.read.work);
  const open = navPlan?.kind === "plan" ? { slug: navPlan.id, version: navPlan.version ?? null } : null;
  const [picked, setPicked] = useState<Compare | null>(null);
  const compare = picked && open && picked.slug === open.slug && picked.version === open.version ? picked : null;
  const filter = useSub("work:plans");
  const [plans, setPlans] = useState<PlanSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (picked && !compare) setPicked(null);
  }, [picked, compare]);

  const listing = open === null;
  useEffect(() => {
    if (!listing) return;
    let live = true;
    setPlans(null);
    listPlans(filter === "all" ? {} : { state: filter })
      .then((p) => live && (setPlans(p), setError(null)))
      .catch((err) => live && setError(errorText(err)));
    return () => {
      live = false;
    };
  }, [filter, listing]);

  return (
    <Page>
      <PageBody>
        {compare ? (
          <CompareView slug={compare.slug} a={compare.a} b={compare.b} onBack={() => setPicked(null)} />
        ) : open ? (
          <PlanView
            key={open.slug}
            slug={open.slug}
            version={open.version}
            onBack={() => useNavStore.getState().closeItem("plan")}
            onView={(version) =>
              useNavStore.getState().openItem({ kind: "plan", id: open.slug, ...(version !== null && { version }) })
            }
            onCompare={(a, b) => setPicked({ ...open, a, b })}
          />
        ) : (
          <>
            <ToolsRow
              picker={
                <ViewPicker
                  title="Plan state"
                  choices={FILTER_CHOICES}
                  value={filter}
                  onChange={(id) => useNavStore.getState().setSub("work:plans", id as typeof filter)}
                />
              }
            />
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
