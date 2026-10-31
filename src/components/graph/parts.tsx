import { cn } from "@/lib/utils";
import type { Box, GraphEdge, GraphNode, GraphStatus, GraphTraffic } from "./types";
import "./graph.css";

export const STATUS_COLOR: Record<GraphStatus, string> = {
  up: "#1D9E75",
  down: "#E24B4A",
  maintenance: "#EF9F27",
  unknown: "#888780",
};

export function edgeKey(e: Pick<GraphEdge, "from" | "to">): string {
  return `${e.from}>${e.to}`;
}

/** Seconds per dash cycle: faster with more traffic in the window, slow for idle lines. */
export function flowSeconds(count: number, quiet: boolean): number {
  if (count === 0) return quiet ? 4 : 6;
  return Math.max(0.6, 2.8 / Math.sqrt(count));
}

/** Spread several line ends along one side of a box so they don't all meet at one point. */
export function spread(box: Box, i: number, n: number): number {
  return box.x + (box.w * (i + 1)) / (n + 1);
}

export function GraphArrow({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M2 1L8 5L2 9" fill="none" stroke="#888780" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </marker>
    </defs>
  );
}

export function GraphLine({
  edge,
  d,
  byId,
  traffic,
  arrow,
}: {
  edge: GraphEdge;
  d: string;
  byId: Record<string, GraphNode>;
  traffic?: GraphTraffic;
  arrow: string;
}) {
  const key = edgeKey(edge);
  const count = traffic?.counts[key] ?? 0;
  const hot = traffic?.hot.has(key) ?? false;
  const down = byId[edge.from]?.status === "down" || byId[edge.to]?.status === "down";
  const color = down ? STATUS_COLOR.down : edge.muted ? "#888780" : "#7F77DD";
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={traffic ? "var(--color-border)" : "#888780"}
        strokeWidth={traffic ? 0.75 : 1}
        markerEnd={`url(#${arrow})`}
      />
      {(traffic || down) && (
        <path
          d={d}
          className={cn("map-flow", hot && "is-hot")}
          stroke={color}
          strokeWidth={1.5}
          opacity={hot || count > 0 || down ? 1 : 0.45}
          style={{ ["--map-dur" as string]: `${hot ? 0.5 : flowSeconds(count, edge.quiet ?? false)}s` }}
        />
      )}
    </g>
  );
}

// Wide uses the CSS font sizes; the 360-wide phone layouts set tighter ones.
const SIZES = {
  wide: { pad: 10, title: 18, sub: 34, dot: 4, dotY: 12, titleFont: undefined, subFont: undefined },
  small: { pad: 9, title: 16, sub: 31, dot: 3.5, dotY: 11, titleFont: 13, subFont: 11 },
  big: { pad: 9, title: 20, sub: 38, dot: 3.5, dotY: 11, titleFont: 16, subFont: 11 },
};

export function GraphBox({
  node,
  box,
  selected,
  size = "small",
  onClick,
}: {
  node: GraphNode;
  box: Box;
  selected: boolean;
  size?: keyof typeof SIZES;
  onClick: () => void;
}) {
  const s = SIZES[size];
  return (
    <g
      className={cn(
        "map-node",
        node.tone === "accent" ? "map-homelab" : "map-plain",
        node.dashed && "map-unplaced",
        selected && "is-selected"
      )}
      onClick={onClick}
      role="button"
      aria-label={`${node.label}${node.status ? `, ${node.status}` : ""}`}
    >
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={8} />
      <text
        className="map-title"
        x={box.x + s.pad}
        y={box.y + s.title}
        dominantBaseline="central"
        style={s.titleFont ? { fontSize: s.titleFont } : undefined}
      >
        {node.label}
      </text>
      {node.sub && (
        <text
          className="map-sub"
          x={box.x + s.pad}
          y={box.y + s.sub}
          dominantBaseline="central"
          style={s.subFont ? { fontSize: s.subFont } : undefined}
        >
          {node.sub}
        </text>
      )}
      {node.status && (
        <circle
          cx={box.x + box.w - s.pad}
          cy={box.y + s.dotY}
          r={s.dot}
          className={node.status === "down" ? "map-pulse" : undefined}
          fill={node.status === "unknown" ? "none" : STATUS_COLOR[node.status]}
          stroke={node.status === "unknown" ? STATUS_COLOR.unknown : "none"}
        />
      )}
    </g>
  );
}
