import type { ProjectDispatchRun } from "@/api/projects";
import { ListRow, ListSection } from "@/components/system";
import { counts } from "@/features/plans/DispatchRuns";
import { ago } from "@/features/plans/planParts";
import { useNavStore } from "@/store/navStore";

export function ProjectDispatchRuns({ runs }: { runs: ProjectDispatchRun[] }) {
  if (runs.length === 0) return null;

  function open(plan: string) {
    useNavStore.getState().openItem({ kind: "dispatch", id: plan });
  }

  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="px-0.5 text-meta text-muted">
        Dispatch runs <span className="font-mono text-caption">{runs.length}</span>
      </h3>
      <ListSection>
        {runs.map((r) => (
          <ListRow
            key={r.plan}
            onClick={() => open(r.plan)}
            title={<span className="font-mono">{r.plan}</span>}
            description={`${r.states.landed ?? 0}/${r.tasks_total} landed`}
            meta={
              <>
                <span>{ago(r.updated_at)}</span>
                <span>{counts(r.states)}</span>
              </>
            }
          />
        ))}
      </ListSection>
    </section>
  );
}
