export type GraphStatus = "up" | "down" | "maintenance" | "unknown";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GraphNode {
  id: string;
  label: string;
  sub?: string | null;
  /** Filled purple (`accent`) or gray (`plain`). */
  tone: "accent" | "plain";
  status?: GraphStatus | null;
  /** Dashed outline, for a node that's still provisional. */
  dashed?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** Slow idle animation: a line with no traffic of its own to show. */
  quiet?: boolean;
  /** Gray instead of purple. */
  muted?: boolean;
}

/** Live activity on the lines. Without it, lines stay still unless an end is down. */
export interface GraphTraffic {
  counts: Record<string, number>;
  hot: Set<string>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Where everything sits in the Wide layout: from hand-placed data, or from autoLayout. */
export interface GraphPlacement {
  width: number;
  height: number;
  box: (node: GraphNode) => Box;
  path: (edge: GraphEdge) => string | null;
  frame?: (Box & { label: string }) | null;
}
