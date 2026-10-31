import type { ArchMap, MapEdge, MapNode } from "@/api/homelab";
import type { GraphData, GraphEdge, GraphNode, GraphPlacement } from "@/components/graph";
import { MAP_W, boxOf, edgePath, homelabFrame, mapHeight } from "./mapGeometry";

export function toGraphNode(n: MapNode): GraphNode {
  return { id: n.id, label: n.label, sub: n.sub, tone: n.kind === "homelab" ? "accent" : "plain", status: n.status, dashed: !n.placed };
}

export function toGraphEdge(e: MapEdge, byId: Record<string, MapNode>): GraphEdge {
  const muted = byId[e.from]?.kind === "external" || byId[e.to]?.kind === "external";
  return { from: e.from, to: e.to, quiet: e.quiet, muted };
}

/** The architecture map as a graph: hand-placed on the column grid in registry/map.yaml. */
export function mapToGraph(map: ArchMap): { graph: GraphData; placement: GraphPlacement } {
  const byId = Object.fromEntries(map.nodes.map((n) => [n.id, n])) as Record<string, MapNode>;
  const edges = new Map(map.edges.map((e) => [`${e.from}>${e.to}`, e]));
  const frame = homelabFrame(map);
  return {
    graph: { nodes: map.nodes.map(toGraphNode), edges: map.edges.map((e) => toGraphEdge(e, byId)) },
    placement: {
      width: MAP_W,
      height: mapHeight(map),
      box: (n) => boxOf(map, byId[n.id]),
      path: (e) => {
        const source = edges.get(`${e.from}>${e.to}`);
        return source ? edgePath(map, boxOf(map, byId[e.from]), boxOf(map, byId[e.to]), source.route) : null;
      },
      frame: frame && { ...frame, label: "Homelab · Proxmox · tailnet only" },
    },
  };
}
