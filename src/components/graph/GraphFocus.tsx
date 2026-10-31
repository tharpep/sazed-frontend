import { cn } from "@/lib/utils";
import { GraphArrow, GraphBox, GraphLine, edgeKey, spread } from "./parts";
import type { Box, GraphData, GraphEdge, GraphNode, GraphTraffic } from "./types";

// A 360-wide viewBox so text stays readable on a 375px phone.
const W = 360;
const M = 12; // side margin
const BOX_H = 44;
const COL_W = (W - 2 * M - 44) / 2; // two columns either side of a 44-wide trunk
const TRUNK_X = W / 2;
const ROW_H = BOX_H + 10;
const CENTER = { w: 200, h: 56 };

export interface FocusLabels {
  incoming: (label: string) => string;
  outgoing: (label: string) => string;
  empty: string;
}

interface Props {
  graph: GraphData;
  traffic?: GraphTraffic;
  center: string;
  trail: string[];
  onFocus: (id: string, fromTrail?: number) => void;
  labels: FocusLabels;
}

/** One node in the middle; what points at it sits above, what it points at sits below. Each
 * group is two columns around a central trunk, so every line has a clear path in. Tapping any
 * box moves the middle there; the trail lets you step back. Needs no positions, so it works for
 * any graph. */
export function GraphFocus({ graph, traffic, center, trail, onFocus, labels }: Props) {
  const byId = Object.fromEntries(graph.nodes.map((n) => [n.id, n])) as Record<string, GraphNode>;
  const node = byId[center] ?? graph.nodes[0];
  const incoming = graph.edges.filter((e) => e.to === node.id && byId[e.from]);
  const outgoing = graph.edges.filter((e) => e.from === node.id && byId[e.to]);

  const groupBoxes = (edges: GraphEdge[], top: number) =>
    edges.map((e, i) => {
      const row = Math.floor(i / 2);
      const left = i % 2 === 0;
      return { e, box: { x: left ? M : W - M - COL_W, y: top + row * ROW_H, w: COL_W, h: BOX_H }, left };
    });

  const inTop = 22;
  const inRows = Math.ceil(incoming.length / 2);
  const centerY = inTop + (inRows ? inRows * ROW_H + 26 : 0);
  const centerBox = { x: (W - CENTER.w) / 2, y: centerY, w: CENTER.w, h: CENTER.h };
  const outTop = centerY + CENTER.h + 34;
  const ins = groupBoxes(incoming, inTop);
  const outs = groupBoxes(outgoing, outTop);
  const height = outTop + Math.ceil(outgoing.length / 2) * ROW_H + 8;

  // Branch from a box's inner side to the trunk, then along the trunk to the middle box.
  const inPath = ({ box, left }: { box: Box; left: boolean }, i: number) => {
    const sx = left ? box.x + box.w : box.x;
    const sy = box.y + box.h / 2;
    const tx = TRUNK_X + (left ? -4 : 4);
    const ex = spread(centerBox, i, ins.length);
    return `M${sx} ${sy} H${tx + (left ? -6 : 6)} Q${tx} ${sy} ${tx} ${sy + 6} V${centerBox.y - 14} Q${tx} ${centerBox.y - 8} ${ex} ${centerBox.y - 6} V${centerBox.y}`;
  };
  const outPath = ({ box, left }: { box: Box; left: boolean }, i: number) => {
    const ex = left ? box.x + box.w : box.x;
    const ey = box.y + box.h / 2;
    const tx = TRUNK_X + (left ? -4 : 4);
    const sx = spread(centerBox, i, outs.length);
    const top = centerBox.y + centerBox.h;
    return `M${sx} ${top} V${top + 6} Q${sx} ${top + 12} ${tx} ${top + 14} V${ey - 6} Q${tx} ${ey} ${tx + (left ? -6 : 6)} ${ey} H${ex}`;
  };

  return (
    <div className="flex flex-col gap-2">
      <nav aria-label="Path" className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
        {trail.map((id, i) => (
          <span key={`${id}-${i}`} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true">›</span>}
            <button
              type="button"
              onClick={() => onFocus(id, i)}
              className={cn("rounded px-1 py-0.5 hover:bg-surface", i === trail.length - 1 && "font-medium text-ink")}
            >
              {byId[id]?.label ?? id}
            </button>
          </span>
        ))}
      </nav>
      <svg key={node.id} viewBox={`0 0 ${W} ${height}`} className="map-fade w-full" role="img" aria-label={`${node.label} and what it connects to`}>
        <GraphArrow id="map-arrow-m" />
        {ins.length > 0 && (
          <text x={M} y={inTop - 8} fontSize={11} fill="var(--color-muted)">
            {labels.incoming(node.label)}
          </text>
        )}
        {outs.length > 0 && (
          <text x={M} y={outTop - 8} fontSize={11} fill="var(--color-muted)">
            {labels.outgoing(node.label)}
          </text>
        )}
        {ins.map((x, i) => <GraphLine key={edgeKey(x.e)} edge={x.e} d={inPath(x, i)} byId={byId} traffic={traffic} arrow="map-arrow-m" />)}
        {outs.map((x, i) => <GraphLine key={edgeKey(x.e)} edge={x.e} d={outPath(x, i)} byId={byId} traffic={traffic} arrow="map-arrow-m" />)}
        {ins.map(({ e, box }) => (
          <GraphBox key={e.from} node={byId[e.from]} box={box} selected={false} onClick={() => onFocus(e.from)} />
        ))}
        <GraphBox node={node} box={centerBox} selected size="big" onClick={() => undefined} />
        {outs.map(({ e, box }) => (
          <GraphBox key={e.to} node={byId[e.to]} box={box} selected={false} onClick={() => onFocus(e.to)} />
        ))}
        {!ins.length && !outs.length && (
          <text x={W / 2} y={centerBox.y + CENTER.h + 30} fontSize={12} textAnchor="middle" fill="var(--color-muted)">
            {labels.empty}
          </text>
        )}
      </svg>
    </div>
  );
}
