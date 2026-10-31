import { cn } from "@/lib/utils";
import type { ArchMap, MapNode } from "@/api/homelab";
import { GraphView } from "@/components/graph";
import { FlowMap } from "./MapFlow";
import { MapPanel } from "./MapPanel";
import { mapToGraph } from "./mapGraph";
import { useMapTraffic } from "./mapTraffic";
import { STATUS_COLOR } from "./mapGeometry";

interface Props {
  map: ArchMap;
  onOpenService: (serviceId: string) => void;
}

/** The architecture map: every piece of Sazed and the homelab, drawn from the gateway's
 * registry/map.yaml, with live health dots and lines that move with real traffic. */
export function MapView({ map, onOpenService }: Props) {
  const traffic = useMapTraffic(map);
  const byId = Object.fromEntries(map.nodes.map((n) => [n.id, n])) as Record<string, MapNode>;
  const { graph, placement } = mapToGraph(map);
  const services = map.nodes.flatMap((n) => n.services);
  const checked = services.filter((s) => s.up !== null);
  const up = checked.filter((s) => s.up).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-muted">
        <span className="flex items-center gap-1.5 text-ink">
          <span
            className={cn("size-2 rounded-full", traffic.live ? "map-pulse" : "")}
            style={{ background: traffic.live ? STATUS_COLOR.up : STATUS_COLOR.unknown }}
            aria-hidden="true"
          />
          {traffic.live ? "Live" : "Connecting…"}
        </span>
        <span className={cn(up < checked.length && "text-destructive")}>
          {up} of {checked.length} up
        </span>
        {(["up", "down", "maintenance"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[k] }} aria-hidden="true" />
            {k === "up" ? "healthy" : k}
          </span>
        ))}
        <span className="sm:ml-auto">Line speed = traffic</span>
      </div>

      <GraphView
        graph={graph}
        placement={placement}
        traffic={traffic}
        start="sazed"
        label="Architecture map with live health and traffic"
        flow={(selected, onSelect) => <FlowMap map={map} traffic={traffic} selected={selected} onSelect={onSelect} />}
        panel={(selected) => {
          const node = byId[selected] ?? map.nodes[0];
          return node ? <MapPanel node={node} map={map} traffic={traffic} onOpenService={onOpenService} /> : null;
        }}
      />
    </div>
  );
}
