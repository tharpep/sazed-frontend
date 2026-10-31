import type { ArchMap, MapEdge, MapNode } from "@/api/homelab";
import { GraphArrow, GraphBox, GraphLine, edgeKey, spread, type Box, type GraphNode } from "@/components/graph";
import { toGraphEdge, toGraphNode } from "./mapGraph";
import type { MapTraffic } from "./mapTraffic";

// The homelab's hand-tuned phone layout. Same data, nodes and live traffic as Wide; only the
// geometry differs. A 360-wide viewBox keeps text readable on a 375px phone.
const W = 360;
const BOX_H = 44;

const M = 12; // side margin
const GAP = 16; // between slots; lines that skip a row run down these gaps
const SLOT_W = (W - 2 * M - 2 * GAP) / 3;
const SLOT_X = [0, 1, 2].map((i) => M + i * (SLOT_W + GAP));
const LANES = [M / 2, M + SLOT_W + GAP / 2, M + 2 * SLOT_W + 1.5 * GAP, W - M / 2];
const LINE_GAP = 26; // between lines in the same tier
const TIER_GAP = 46; // between tiers (room for curves and labels)
const TIER_LABEL: Record<number, string> = { 0: "You", 4: "Outside" };

interface Placed {
  node: MapNode;
  box: Box;
  line: number;
}

/** Map columns become tiers stacked top to bottom (clients, front door, core, data, outside).
 * Every box sits on a fixed three-slot grid, so the gaps between slots stay clear the whole way
 * down: a line that skips a row runs down a gap instead of through boxes. Within a tier, nodes
 * are ordered by where their neighbours already sit, which keeps crossings down. */
function layoutFlow(map: ArchMap) {
  const placed = new Map<string, Placed>();
  const tiers = [...new Set(map.nodes.map((n) => n.col))].sort((a, b) => a - b);
  const neighbours = (id: string) =>
    map.edges.flatMap((e) => (e.from === id ? [e.to] : e.to === id ? [e.from] : []));
  let y = 22;
  let line = 0;
  const tierTop: Record<number, number> = {};
  const tierBottom: Record<number, number> = {};

  // Boxes with no lines (AdGuard today) take a free slot in a higher homelab row rather than a
  // row of their own, which would push every line below around them.
  const degree = (id: string) => map.edges.filter((e) => e.from === id || e.to === id).length;
  const lone = new Set(map.nodes.filter((n) => n.kind === "homelab" && degree(n.id) === 0).map((n) => n.id));
  const colOf = new Map(map.nodes.map((n) => [n.id, n.col]));
  const filled = (c: number) => map.nodes.filter((n) => colOf.get(n.id) === c).length;
  for (const id of lone) {
    const home = tiers.find(
      (c) => c !== colOf.get(id) && map.nodes.some((n) => n.col === c && n.kind === "homelab") && filled(c) % 3 !== 0
    );
    if (home !== undefined) colOf.set(id, home);
  }
  const combos = (k: number): number[][] =>
    k === 3 ? [[0, 1, 2]] : k === 2 ? [[0, 1], [0, 2], [1, 2]] : k === 1 ? [[0], [1], [2]] : [[]];

  for (const [ti, col] of tiers.entries()) {
    const want = (n: MapNode) => {
      const xs = neighbours(n.id).flatMap((id) => {
        const p = placed.get(id);
        return p ? [p.box.x + p.box.w / 2] : [];
      });
      return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : W / 2;
    };
    const nodes = map.nodes
      .filter((n) => colOf.get(n.id) === col)
      .sort((a, b) => Number(lone.has(a.id)) - Number(lone.has(b.id)) || want(a) - want(b) || a.row - b.row);
    tierTop[col] = y;
    for (let i = 0; i < nodes.length; i += 3) {
      const chunk = nodes.slice(i, i + 3);
      const linked = chunk.filter((n) => !lone.has(n.id));
      // Linked boxes take the slots closest to their neighbours; lone ones fill what's left.
      const cost = (slots: number[]) => slots.reduce((s, slot, k) => s + Math.abs(SLOT_X[slot] + SLOT_W / 2 - want(linked[k])), 0);
      const slots = combos(linked.length).reduce((best, o) => (cost(o) < cost(best) ? o : best));
      const free = [0, 1, 2].filter((x) => !slots.includes(x));
      const order = [...linked, ...chunk.filter((n) => lone.has(n.id))];
      const all = [...slots, ...free];
      order.forEach((n, k) => placed.set(n.id, { node: n, box: { x: SLOT_X[all[k]], y, w: SLOT_W, h: BOX_H }, line }));
      line += 1;
      const last = i + 3 >= nodes.length;
      y += BOX_H + (last ? (ti === tiers.length - 1 ? 0 : TIER_GAP) : LINE_GAP);
    }
    tierBottom[col] = y - (ti === tiers.length - 1 ? 0 : TIER_GAP);
  }
  return { placed, height: y + 14, tierTop, tierBottom };
}

function flowPaths(map: ArchMap, placed: Map<string, Placed>): Map<string, string> {
  // Line ends per box side, ordered by the other end's x so neighbouring lines don't cross.
  const ends = new Map<string, MapEdge[]>();
  const add = (k: string, e: MapEdge) => ends.set(k, [...(ends.get(k) ?? []), e]);
  const down = (e: MapEdge) => placed.get(e.to)!.line > placed.get(e.from)!.line;
  for (const e of map.edges) {
    if (!placed.has(e.from) || !placed.has(e.to)) continue;
    if (placed.get(e.to)!.line === placed.get(e.from)!.line) continue;
    add(`${e.from}:${down(e) ? "bottom" : "top"}`, e);
    add(`${e.to}:${down(e) ? "top" : "bottom"}`, e);
  }
  const cx = (id: string) => placed.get(id)!.box.x + placed.get(id)!.box.w / 2;
  for (const [k, list] of ends) {
    const id = k.split(":")[0];
    list.sort((a, b) => cx(a.from === id ? a.to : a.from) - cx(b.from === id ? b.to : b.from));
  }
  const endX = (id: string, side: string, e: MapEdge) => {
    const list = ends.get(`${id}:${side}`)!;
    return spread(placed.get(id)!.box, list.indexOf(e), list.length);
  };
  const laneUse: Record<number, number> = {};

  const paths = new Map<string, string>();
  for (const e of map.edges) {
    const pa = placed.get(e.from);
    const pb = placed.get(e.to);
    if (!pa || !pb) continue;
    const a = pa.box;
    const b = pb.box;
    if (pa.line === pb.line) {
      // Same row: side to side when neighbours, else under the row through the gap below.
      const [l, r] = a.x < b.x ? [a, b] : [b, a];
      const ym = a.y + a.h / 2;
      if (r.x - (l.x + l.w) <= GAP + 1) {
        paths.set(edgeKey(e), a.x < b.x ? `M${a.x + a.w} ${ym} H${b.x}` : `M${a.x} ${ym} H${b.x + b.w}`);
      } else {
        const yb = a.y + a.h + 12;
        paths.set(edgeKey(e), `M${a.x + a.w / 2} ${a.y + a.h} V${yb} H${b.x + b.w / 2} V${b.y + b.h}`);
      }
      continue;
    }
    const goingDown = pb.line > pa.line;
    const x1 = endX(e.from, goingDown ? "bottom" : "top", e);
    const y1 = goingDown ? a.y + a.h : a.y;
    const x2 = endX(e.to, goingDown ? "top" : "bottom", e);
    const y2 = goingDown ? b.y : b.y + b.h;
    if (Math.abs(pb.line - pa.line) === 1) {
      const m = (y1 + y2) / 2;
      paths.set(edgeKey(e), `M${x1} ${y1} C${x1} ${m} ${x2} ${m} ${x2} ${y2}`);
      continue;
    }
    // Skips a row: drop into the gap, run down the nearest lane, then into the target.
    const target = (x1 + x2) / 2;
    const laneIdx = LANES.reduce((best, x, i) => (Math.abs(x - target) < Math.abs(LANES[best] - target) ? i : best), 0);
    const nth = (laneUse[laneIdx] = (laneUse[laneIdx] ?? 0) + 1) - 1;
    const lx = LANES[laneIdx] + (nth % 2 ? -1 : 1) * Math.ceil(nth / 2) * 3;
    const dir = goingDown ? 1 : -1;
    // Stagger the horizontal runs so lines leaving (or entering) one box don't stack.
    const ia = ends.get(`${e.from}:${goingDown ? "bottom" : "top"}`)!.indexOf(e);
    const ib = ends.get(`${e.to}:${goingDown ? "top" : "bottom"}`)!.indexOf(e);
    const ya = y1 + dir * (8 + ia * 3);
    const yb = y2 - dir * (8 + ib * 3);
    paths.set(
      edgeKey(e),
      `M${x1} ${y1} V${ya - dir * 6} Q${x1} ${ya} ${x1 + Math.sign(lx - x1) * 6} ${ya} H${lx - Math.sign(lx - x1) * 6} Q${lx} ${ya} ${lx} ${ya + dir * 6} ` +
        `V${yb - dir * 6} Q${lx} ${yb} ${lx + Math.sign(x2 - lx) * 6} ${yb} H${x2 - Math.sign(x2 - lx) * 6} Q${x2} ${yb} ${x2} ${yb + dir * 6} V${y2}`
    );
  }
  return paths;
}

export function FlowMap({
  map,
  traffic,
  selected,
  onSelect,
}: {
  map: ArchMap;
  traffic: MapTraffic;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { placed, height, tierTop, tierBottom } = layoutFlow(map);
  const paths = flowPaths(map, placed);
  const byId = Object.fromEntries(map.nodes.map((n) => [n.id, n])) as Record<string, MapNode>;
  const graphById: Record<string, GraphNode> = Object.fromEntries(map.nodes.map((n) => [n.id, toGraphNode(n)]));
  const homelabCols = [...new Set(map.nodes.filter((n) => n.kind === "homelab").map((n) => n.col))];
  const frameTop = Math.min(...homelabCols.map((c) => tierTop[c])) - 26;
  const frameBottom = Math.max(...homelabCols.map((c) => tierBottom[c])) + 10;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Architecture map, top to bottom">
      <GraphArrow id="map-arrow-m" />
      {homelabCols.length > 0 && (
        <>
          <rect x={2} y={frameTop} width={W - 4} height={frameBottom - frameTop} rx={14} fill="none" stroke="var(--color-border)" strokeWidth={0.75} strokeDasharray="4 4" />
          <text x={12} y={frameTop + 15} fontSize={11} fill="var(--color-muted)">
            Homelab · tailnet only
          </text>
        </>
      )}
      {Object.entries(TIER_LABEL).map(([col, label]) =>
        tierTop[Number(col)] !== undefined ? (
          <text key={col} x={12} y={tierTop[Number(col)] - 7} fontSize={11} fill="var(--color-muted)">
            {label}
          </text>
        ) : null
      )}
      {map.edges.map((e) => {
        const d = paths.get(edgeKey(e));
        return d ? <GraphLine key={edgeKey(e)} edge={toGraphEdge(e, byId)} d={d} byId={graphById} traffic={traffic} arrow="map-arrow-m" /> : null;
      })}
      {[...placed.values()].map(({ node, box }) => (
        <GraphBox key={node.id} node={toGraphNode(node)} box={box} selected={selected === node.id} onClick={() => onSelect(node.id)} />
      ))}
    </svg>
  );
}
