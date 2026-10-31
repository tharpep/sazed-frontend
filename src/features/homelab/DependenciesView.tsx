import { useMemo } from "react";

import type { Service } from "@/api/homelab";
import { GraphView, autoLayout, type FocusLabels, type GraphData, type GraphStatus } from "@/components/graph";
import { STATUS_LABEL, StatusDot, statusOf } from "./format";

const LABELS: FocusLabels = {
  incoming: (label) => `Depends on ${label}`,
  outgoing: (label) => `${label} depends on`,
  empty: "Nothing here depends on this",
};

function buildGraph(services: Service[]): GraphData {
  const ids = new Set(services.map((s) => s.id));
  const edges = services.flatMap((s) =>
    s.depends_on.filter((d) => ids.has(d)).map((d) => ({ from: s.id, to: d, quiet: true }))
  );
  const linked = new Set(edges.flatMap((e) => [e.from, e.to]));
  const nodes = services
    .filter((s) => linked.has(s.id))
    .map((s) => {
      const status = statusOf(s);
      return {
        id: s.id,
        label: s.name,
        sub: s.container ? `CT ${s.container}` : null,
        tone: s.group === "apps" ? ("plain" as const) : ("accent" as const),
        status: (status === "planned" ? "unknown" : status) as GraphStatus,
      };
    });
  return { nodes, edges };
}

/** Everything that stops working if this service does, directly or through something else. */
function affectedBy(id: string, graph: GraphData): string[] {
  const seen = new Set<string>();
  const walk = (target: string) => {
    for (const edge of graph.edges) {
      if (edge.to === target && edge.from !== id && !seen.has(edge.from)) {
        seen.add(edge.from);
        walk(edge.from);
      }
    }
  };
  walk(id);
  return [...seen];
}

function Panel({
  service,
  graph,
  byId,
  onOpenService,
}: {
  service: Service;
  graph: GraphData;
  byId: Map<string, Service>;
  onOpenService: (serviceId: string) => void;
}) {
  const name = (id: string) => byId.get(id)?.name ?? id;
  const affected = affectedBy(service.id, graph).map(name);
  const needs = service.depends_on.map(name);
  const status = statusOf(service);

  return (
    <section aria-label={`${service.name} details`} className="rounded-xl border border-border px-4 py-3.5">
      <div className="mb-2.5 flex flex-wrap items-center gap-x-2">
        <StatusDot kind={status} />
        <span className="text-base font-medium text-ink">{service.name}</span>
        <span className="text-[13px] text-muted">{STATUS_LABEL[status]}</span>
      </div>
      <p className="text-sm text-ink">
        {affected.length > 0
          ? `If this goes down, ${affected.length} ${affected.length === 1 ? "service is" : "services are"} affected: ${affected.join(", ")}`
          : "Nothing here depends on this."}
      </p>
      {needs.length > 0 && <p className="mt-1.5 text-[13px] text-muted">Needs {needs.join(", ")}</p>}
      <button
        type="button"
        onClick={() => onOpenService(service.id)}
        className="mt-3 rounded-md border border-border px-2 py-1 text-xs text-ink transition-colors hover:bg-surface"
      >
        Manage {service.name}
      </button>
    </section>
  );
}

interface Props {
  services: Service[];
  onOpenService: (serviceId: string) => void;
}

/** What depends on what, from the registry's depends_on, with live health. */
export function DependenciesView({ services, onOpenService }: Props) {
  const { graph, placement, start, byId } = useMemo(() => {
    const graph = buildGraph(services);
    // Start on whatever the most depends on: the answer to "what's the riskiest piece?"
    const counts = graph.nodes.map((n) => [n.id, affectedBy(n.id, graph).length] as const);
    const start = counts.reduce((best, c) => (c[1] > best[1] ? c : best), ["", -1] as readonly [string, number])[0];
    return { graph, placement: autoLayout(graph), start, byId: new Map(services.map((s) => [s.id, s])) };
  }, [services]);

  if (graph.nodes.length === 0) {
    return <p className="text-sm text-muted">No service dependencies to show.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-muted">
        Arrows point at what a service needs. Pick one to see what's affected if it goes down.
      </p>
      <GraphView
        graph={graph}
        placement={placement}
        start={start}
        label="Service dependencies with live health"
        labels={LABELS}
        panel={(selected) => {
          const service = byId.get(selected);
          return service ? <Panel service={service} graph={graph} byId={byId} onOpenService={onOpenService} /> : null;
        }}
      />
    </div>
  );
}
