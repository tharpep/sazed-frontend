import { useState, type ReactNode } from "react";

import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { GraphFocus, type FocusLabels } from "./GraphFocus";
import { GraphWide } from "./GraphWide";
import type { GraphData, GraphPlacement, GraphTraffic } from "./types";

type Layout = "wide" | "flow" | "focus";
const LAYOUT_LABEL: Record<Layout, string> = { wide: "Wide", flow: "Flow", focus: "Focus" };

const DEFAULT_LABELS: FocusLabels = {
  incoming: (label) => `Talks to ${label}`,
  outgoing: (label) => `${label} talks to`,
  empty: "Nothing on the map connects to this yet",
};

interface Props {
  graph: GraphData;
  placement: GraphPlacement;
  traffic?: GraphTraffic;
  /** The node selected first. */
  start: string;
  label: string;
  labels?: FocusLabels;
  /** A hand-tuned phone layout for graphs that have one. */
  flow?: (selected: string, onSelect: (id: string) => void) => ReactNode;
  /** The detail panel for the selected node. */
  panel?: (selected: string) => ReactNode;
}

/** A node-and-line graph with Wide, Focus and optional Flow layouts. Data decides what's drawn:
 * the homelab map hand-places its nodes, and other graphs get positions from autoLayout. */
export function GraphView({ graph, placement, traffic, start, label, labels = DEFAULT_LABELS, flow, panel }: Props) {
  const [selected, setSelected] = useState(start);
  const isMobile = useIsMobile();
  // Wide needs a desktop-width screen, so phones get Flow and Focus only. Each lands on the
  // layout that reads best at its size, not the last one used.
  const layouts: Layout[] = [
    ...(isMobile ? [] : (["wide"] as const)),
    ...(flow ? (["flow"] as const) : []),
    "focus",
  ];
  const [chosen, setChosen] = useState<Layout | null>(null);
  const layout = chosen && layouts.includes(chosen) ? chosen : isMobile ? "focus" : "wide";
  const [trail, setTrail] = useState<string[]>([start]);

  // A box picked in Wide or Flow joins the trail, so switching to Focus starts from it.
  const trailTo = (id: string) => (trail[trail.length - 1] === id ? trail : [...trail.filter((x) => x !== id), id].slice(-5));

  function focus(id: string, fromTrail?: number) {
    setSelected(id);
    setTrail(fromTrail !== undefined ? trailTo(selected).slice(0, fromTrail + 1) : [...trailTo(selected).filter((x) => x !== id), id].slice(-5));
  }

  return (
    <>
      {layouts.length > 1 && (
        <div role="tablist" aria-label="Map layout" className="flex gap-1 self-start rounded-md bg-surface p-0.5">
          {layouts.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={layout === v}
              onClick={() => setChosen(v)}
              className={cn("rounded px-2.5 py-0.5 text-sm", layout === v ? "bg-bg font-medium text-ink shadow-sm" : "text-muted")}
            >
              {LAYOUT_LABEL[v]}
            </button>
          ))}
        </div>
      )}

      {/* Flow and Focus are drawn for a phone; on desktop they stay phone-width and centred. */}
      {layout === "flow" && <div className="mx-auto w-full max-w-[440px]">{flow?.(selected, setSelected)}</div>}
      {layout === "focus" && (
        <div className="mx-auto w-full max-w-[440px]">
          <GraphFocus graph={graph} traffic={traffic} center={selected} trail={trailTo(selected)} onFocus={focus} labels={labels} />
        </div>
      )}

      <div className={cn("-mx-4 overflow-x-auto px-4", layout !== "wide" && "hidden")}>
        <GraphWide graph={graph} placement={placement} traffic={traffic} selected={selected} onSelect={setSelected} label={label} />
      </div>

      {panel?.(selected)}
    </>
  );
}
