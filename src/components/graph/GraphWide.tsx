import { GraphArrow, GraphBox, GraphLine, edgeKey } from "./parts";
import type { GraphData, GraphNode, GraphPlacement, GraphTraffic } from "./types";

interface Props {
  graph: GraphData;
  placement: GraphPlacement;
  traffic?: GraphTraffic;
  selected: string;
  onSelect: (id: string) => void;
  label: string;
}

/** The full graph, left to right. Needs a desktop-width screen. */
export function GraphWide({ graph, placement, traffic, selected, onSelect, label }: Props) {
  const byId = Object.fromEntries(graph.nodes.map((n) => [n.id, n])) as Record<string, GraphNode>;
  const { frame } = placement;

  return (
    <svg
      viewBox={`0 0 ${placement.width} ${placement.height}`}
      className="w-full min-w-[620px]"
      role="img"
      aria-label={label}
    >
      <GraphArrow id="map-arrow" />
      {frame && (
        <>
          <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} rx={16} fill="none" stroke="var(--color-border)" strokeWidth={0.75} strokeDasharray="4 4" />
          <text x={frame.x + 14} y={frame.y + 18} fontSize={12} fill="var(--color-muted)">
            {frame.label}
          </text>
        </>
      )}

      {graph.edges.map((e) => {
        const d = byId[e.from] && byId[e.to] ? placement.path(e) : null;
        return d ? <GraphLine key={edgeKey(e)} edge={e} d={d} byId={byId} traffic={traffic} arrow="map-arrow" /> : null;
      })}

      {graph.nodes.map((n) => (
        <GraphBox
          key={n.id}
          node={n}
          box={placement.box(n)}
          selected={selected === n.id}
          size="wide"
          onClick={() => onSelect(n.id)}
        />
      ))}
    </svg>
  );
}
