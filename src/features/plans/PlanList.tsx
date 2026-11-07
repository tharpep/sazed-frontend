import { ListRow, ListSection } from "@/components/system";
import type { PlanSummary } from "@/api/plans";
import { Author, PlanStatePill, ago } from "./planParts";

function lastChange(plan: PlanSummary) {
  if (!plan.last_author) return null;
  return (
    <>
      <Author name={plan.last_author} />, {ago(plan.last_saved_at)}
      {plan.last_reason ? `: ${plan.last_reason}` : ""}
    </>
  );
}

export function PlanList({
  plans,
  onOpen,
  showProject = true,
}: {
  plans: PlanSummary[];
  onOpen: (plan: PlanSummary) => void;
  showProject?: boolean;
}) {
  return (
    <ListSection>
      {plans.map((plan) => (
        <ListRow
          key={plan.slug}
          onClick={() => onOpen(plan)}
          title={plan.title}
          description={
            <>
              {showProject && plan.project_title ? `${plan.project_title} · ` : ""}v{plan.version}
              {plan.last_author && " · "}
              {lastChange(plan)}
            </>
          }
          meta={
            <>
              <PlanStatePill state={plan.state} />
              <span className="font-mono">
                {plan.cards_done}/{plan.cards_total} cards
              </span>
              {plan.stale && (
                <span className="text-warn">
                  stale{plan.cards_moved_since > 0 && ` · ${plan.cards_moved_since} moved`}
                </span>
              )}
            </>
          }
        />
      ))}
    </ListSection>
  );
}
