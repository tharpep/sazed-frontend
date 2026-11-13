import { useEffect, useState } from "react";

import { listPlans, type PlanSummary } from "@/api/plans";
import { useNavStore } from "@/store/navStore";
import { PlanList } from "./PlanList";

export function ProjectPlans({ project }: { project: string }) {
  const [plans, setPlans] = useState<PlanSummary[]>([]);

  useEffect(() => {
    let live = true;
    listPlans({ project })
      .then((p) => live && setPlans(p))
      .catch(() => live && setPlans([]));
    return () => {
      live = false;
    };
  }, [project]);

  if (plans.length === 0) return null;

  function open(plan: PlanSummary) {
    useNavStore.getState().openItem({ kind: "plan", id: plan.slug });
  }

  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="px-0.5 text-meta text-muted">
        Plans <span className="font-mono text-caption">{plans.length}</span>
      </h3>
      <PlanList plans={plans} onOpen={open} showProject={false} />
    </section>
  );
}
