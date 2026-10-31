import dagre from "@dagrejs/dagre";

import { edgeKey } from "./parts";
import type { Box, GraphData, GraphPlacement } from "./types";

const NODE_W = 136;
const NODE_H = 48;

/** Curves a line through dagre's bend points instead of joining them with sharp corners. */
function smooth(points: { x: number; y: number }[]): string {
  const [first, ...rest] = points;
  const last = rest.pop();
  if (!first || !last) return "";
  let d = `M${first.x} ${first.y}`;
  rest.forEach((p, i) => {
    const next = rest[i + 1] ?? last;
    d += ` Q${p.x} ${p.y} ${(p.x + next.x) / 2} ${(p.y + next.y) / 2}`;
  });
  return `${d} L${last.x} ${last.y}`;
}

/** Positions for a graph nobody placed by hand, left to right along its arrows. */
export function autoLayout(graph: GraphData): GraphPlacement {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 12, ranksep: 40, marginx: 4, marginy: 4 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const node of graph.nodes) g.setNode(node.id, { width: NODE_W, height: NODE_H });
  for (const edge of graph.edges) g.setEdge(edge.from, edge.to);
  dagre.layout(g);

  const boxes = new Map<string, Box>(
    graph.nodes.map((node) => {
      const { x, y } = g.node(node.id);
      return [node.id, { x: x - NODE_W / 2, y: y - NODE_H / 2, w: NODE_W, h: NODE_H }];
    })
  );
  const paths = new Map(
    graph.edges.map((edge) => [edgeKey(edge), smooth(g.edge(edge.from, edge.to).points ?? [])])
  );
  const { width = 0, height = 0 } = g.graph();

  return {
    width,
    height,
    box: (node) => boxes.get(node.id) ?? { x: 0, y: 0, w: NODE_W, h: NODE_H },
    path: (edge) => paths.get(edgeKey(edge)) ?? null,
  };
}
