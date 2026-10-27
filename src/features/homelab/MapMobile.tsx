import { cn } from "@/lib/utils";
import type { ArchMap, MapEdge, MapNode } from "@/api/homelab";
import type { MapTraffic } from "./mapTraffic";
import { STATUS_COLOR, edgeKey, flowSeconds, type Box } from "./mapGeometry";

// Phone layouts for the architecture map. Same data, nodes and live traffic as MapView; only
// the geometry differs. Both use a 360-wide viewBox so text stays readable on a 375px phone.
const W = 360;
const BOX_H = 44;

// --------------------------------------------------------------------------- shared drawing

function NodeBox({
  node,
  box,
  selected,
  big = false,
  onClick,
}: {
  node: MapNode;
  box: Box;
  selected: boolean;
  big?: boolean;
  onClick: () => void;
}) {
  return (
    <g
      className={cn("map-node", node.kind === "homelab" ? "map-homelab" : "map-plain", selected && "is-selected")}
      onClick={onClick}
      role="button"
      aria-label={`${node.label}${node.status ? `, ${node.status}` : ""}`}
    >
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={8} />
      <text
        className="map-title"
        x={box.x + 9}
        y={box.y + (big ? 20 : 16)}
        dominantBaseline="central"
        style={big ? { fontSize: 16 } : { fontSize: 13 }}
      >
        {node.label}
      </text>
      {node.sub && (
        <text className="map-sub" x={box.x + 9} y={box.y + (big ? 38 : 31)} dominantBaseline="central" style={{ fontSize: 11 }}>
          {node.sub}
        </text>
      )}
      {node.status && (
        <circle
          cx={box.x + box.w - 9}
          cy={box.y + 11}
          r={3.5}
          className={node.status === "down" ? "map-pulse" : undefined}
          fill={node.status === "unknown" ? "none" : STATUS_COLOR[node.status]}
          stroke={node.status === "unknown" ? STATUS_COLOR.unknown : "none"}
        />
      )}
    </g>
  );
}

function Edge({ edge, d, byId, traffic }: { edge: MapEdge; d: string; byId: Record<string, MapNode>; traffic: MapTraffic }) {
  const a = byId[edge.from];
  const b = byId[edge.to];
  const key = edgeKey(edge);
  const count = traffic.counts[key] ?? 0;
  const hot = traffic.hot.has(key);
  const down = a?.status === "down" || b?.status === "down";
  const external = a?.kind === "external" || b?.kind === "external";
  const color = down ? STATUS_COLOR.down : external ? "#888780" : "#7F77DD";
  return (
    <g>
      <path d={d} fill="none" stroke="var(--color-border)" strokeWidth={0.75} markerEnd="url(#map-arrow-m)" />
      <path
        d={d}
        className={cn("map-flow", hot && "is-hot")}
        stroke={color}
        strokeWidth={1.5}
        opacity={hot || count > 0 || down ? 1 : 0.45}
        style={{ ["--map-dur" as string]: `${hot ? 0.5 : flowSeconds(count, edge.quiet)}s` }}
      />
    </g>
  );
}

function Arrow() {
  return (
    <defs>
      <marker id="map-arrow-m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M2 1L8 5L2 9" fill="none" stroke="#888780" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </marker>
    </defs>
  );
}

/** Spread several line ends along one side of a box so they don't all meet at one point. */
function spread(box: Box, i: number, n: number): number {
  return box.x + (box.w * (i + 1)) / (n + 1);
}

// --------------------------------------------------------------------------- A. vertical flow

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
  const homelabCols = [...new Set(map.nodes.filter((n) => n.kind === "homelab").map((n) => n.col))];
  const frameTop = Math.min(...homelabCols.map((c) => tierTop[c])) - 26;
  const frameBottom = Math.max(...homelabCols.map((c) => tierBottom[c])) + 10;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Architecture map, top to bottom">
      <Arrow />
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
        return d ? <Edge key={edgeKey(e)} edge={e} d={d} byId={byId} traffic={traffic} /> : null;
      })}
      {[...placed.values()].map(({ node, box }) => (
        <NodeBox key={node.id} node={node} box={box} selected={selected === node.id} onClick={() => onSelect(node.id)} />
      ))}
    </svg>
  );
}

// --------------------------------------------------------------------------- C. focus view

const COL_W = (W - 2 * M - 44) / 2; // two columns either side of a 44-wide trunk
const TRUNK_X = W / 2;
const ROW_H = BOX_H + 10;
const CENTER = { w: 200, h: 56 };

/** One node in the middle; what talks to it sits above, what it talks to sits below. Each
 * group is two columns around a central trunk, so every line has a clear path in. Tapping any
 * box moves the middle there; the trail lets you step back. */
export function FocusMap({
  map,
  traffic,
  center,
  trail,
  onFocus,
}: {
  map: ArchMap;
  traffic: MapTraffic;
  center: string;
  trail: string[];
  onFocus: (id: string, fromTrail?: number) => void;
}) {
  const byId = Object.fromEntries(map.nodes.map((n) => [n.id, n])) as Record<string, MapNode>;
  const node = byId[center] ?? map.nodes[0];
  const incoming = map.edges.filter((e) => e.to === node.id && byId[e.from]);
  const outgoing = map.edges.filter((e) => e.from === node.id && byId[e.to]);

  const groupBoxes = (edges: MapEdge[], top: number) =>
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
        <Arrow />
        {ins.length > 0 && (
          <text x={M} y={inTop - 8} fontSize={11} fill="var(--color-muted)">
            Talks to {node.label}
          </text>
        )}
        {outs.length > 0 && (
          <text x={M} y={outTop - 8} fontSize={11} fill="var(--color-muted)">
            {node.label} talks to
          </text>
        )}
        {ins.map((x, i) => <Edge key={edgeKey(x.e)} edge={x.e} d={inPath(x, i)} byId={byId} traffic={traffic} />)}
        {outs.map((x, i) => <Edge key={edgeKey(x.e)} edge={x.e} d={outPath(x, i)} byId={byId} traffic={traffic} />)}
        {ins.map(({ e, box }) => (
          <NodeBox key={e.from} node={byId[e.from]} box={box} selected={false} onClick={() => onFocus(e.from)} />
        ))}
        <NodeBox node={node} box={centerBox} selected big onClick={() => undefined} />
        {outs.map(({ e, box }) => (
          <NodeBox key={e.to} node={byId[e.to]} box={box} selected={false} onClick={() => onFocus(e.to)} />
        ))}
        {!ins.length && !outs.length && (
          <text x={W / 2} y={centerBox.y + CENTER.h + 30} fontSize={12} textAnchor="middle" fill="var(--color-muted)">
            Nothing on the map connects to this yet
          </text>
        )}
      </svg>
    </div>
  );
}
