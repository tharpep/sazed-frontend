import type { ActivityEvent } from "@/api/activity";
import type { ArchMap, MapEdge, MapNode, MapSignal } from "@/api/homelab";
import { edgeKey, flowSeconds, STATUS_COLOR, type Box } from "@/components/graph";

export { edgeKey, flowSeconds, STATUS_COLOR, type Box };

export const NODE_H = 48;

export const MAP_W = 680;

export function boxOf(map: ArchMap, n: MapNode): Box {
  const col = map.layout.columns[n.col];
  return { x: col.x, y: map.layout.top + n.row * map.layout.row_height, w: col.w, h: NODE_H };
}

/** Lines between nodes, routed the way the mockup draws them: curves into the next column,
 * straight drops within a column, and `route: over` lines across the top of the map. */
export function edgePath(map: ArchMap, a: Box, b: Box, route: MapEdge["route"]): string {
  if (route === "over") {
    const lane = map.layout.top - 18;
    const ax = a.x + a.w / 2;
    const bx = b.x + b.w / 2;
    return `M${ax} ${a.y} V${lane} H${bx} V${b.y}`;
  }
  if (b.x > a.x + a.w) {
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    const m = (x1 + x2) / 2;
    return `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`;
  }
  if (b.x + b.w < a.x) {
    const x1 = a.x;
    const y1 = a.y + a.h / 2;
    const x2 = b.x + b.w;
    const y2 = b.y + b.h / 2;
    const m = (x1 + x2) / 2;
    return `M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}`;
  }
  const cx = a.x + a.w / 2;
  return b.y > a.y ? `M${cx} ${a.y + a.h} V${b.y}` : `M${cx} ${a.y} V${b.y + b.h}`;
}

/** The dashed frame around the homelab nodes, with room for its label on top. */
export function homelabFrame(map: ArchMap): Box | null {
  const boxes = map.nodes.filter((n) => n.kind === "homelab").map((n) => boxOf(map, n));
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((b) => b.x)) - 10;
  const y = Math.min(...boxes.map((b) => b.y)) - 36;
  const right = Math.max(...boxes.map((b) => b.x + b.w)) + 12;
  const bottom = Math.max(...boxes.map((b) => b.y + b.h)) + 10;
  return { x, y, w: right - x, h: bottom - y };
}

export function mapHeight(map: ArchMap): number {
  const bottoms = map.nodes.map((n) => boxOf(map, n).y + NODE_H);
  const frame = homelabFrame(map);
  return Math.max(...bottoms, frame ? frame.y + frame.h : 0) + 12;
}

const compiled = new Map<string, RegExp>();
function re(source: string, flags: string): RegExp {
  const key = `${flags}:${source}`;
  let r = compiled.get(key);
  if (!r) {
    r = flags.includes("^") ? new RegExp(`^(?:${source})$`) : new RegExp(source, "i");
    compiled.set(key, r);
  }
  return r;
}

export function signalMatches(s: MapSignal, e: Pick<ActivityEvent, "kind" | "title" | "refs">): boolean {
  if (!re(s.kind, "^").test(e.kind)) return false;
  if (s.title && !re(s.title, "i").test(e.title)) return false;
  if (s.agent && e.refs.agent !== s.agent) return false;
  return true;
}

export function edgesFor(map: ArchMap, e: Pick<ActivityEvent, "kind" | "title" | "refs">): MapEdge[] {
  return map.edges.filter((edge) => edge.signals.some((s) => signalMatches(s, e)));
}
