import { useLayoutEffect, useState, type RefObject } from "react";

import type { DispatchTask } from "@/api/dispatch";
import { stateOf } from "./dispatchRun";

interface Edge {
  d: string;
  head: string;
  flow: boolean;
}

interface Box {
  l: number;
  r: number;
  t: number;
  h: number;
}

const NARROW = 760;

function measure(host: HTMLElement, tasks: DispatchTask[]): Edge[] {
  if (window.innerWidth < NARROW) return [];
  const origin = host.getBoundingClientRect();
  const box = (node: string): Box | null => {
    const el = host.querySelector(`[data-node="${CSS.escape(node)}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { l: r.left - origin.left, r: r.right - origin.left, t: r.top - origin.top, h: r.height };
  };
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const edges: Edge[] = [];
  const link = (a: Box | null, b: Box | null, flow: boolean) => {
    if (!a || !b || a.r > b.l) return;
    const x1 = a.r;
    const y1 = a.t + Math.min(15, a.h / 2);
    const x2 = b.l;
    const y2 = b.t + Math.min(15, b.h / 2);
    const m = (x1 + x2) / 2;
    edges.push({
      d: `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2 - 4},${y2}`,
      head: `M${x2 - 8},${y2 - 3} L${x2 - 2},${y2} L${x2 - 8},${y2 + 3}`,
      flow,
    });
  };
  for (const t of tasks) {
    const state = stateOf(t);
    for (const d of t.depends_on) {
      const dep = byId.get(d);
      if (!dep) continue;
      const landed = stateOf(dep) === "landed";
      if (state === "running" && landed) link(box(`t:${d}`), box(`t:${t.id}`), true);
      else if (state === "next") link(box(landed ? "integ" : `t:${d}`), box(`t:${t.id}`), false);
    }
  }
  return edges;
}

export function DispatchEdges({ hostRef, tasks }: { hostRef: RefObject<HTMLDivElement | null>; tasks: DispatchTask[] }) {
  const [edges, setEdges] = useState<Edge[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const run = () => {
      setEdges(measure(host, tasks));
      setSize({ w: host.scrollWidth, h: host.scrollHeight });
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(host);
    return () => ro.disconnect();
  }, [hostRef, tasks]);

  return (
    <svg
      aria-hidden="true"
      width={size.w}
      height={size.h}
      className="pointer-events-none absolute top-0 left-0 hidden overflow-visible min-[760px]:block"
    >
      {edges.map((e, i) => (
        <g key={i} fill="none" strokeWidth={1.4} className={e.flow ? "stroke-primary" : "stroke-muted/50"}>
          <path d={e.d} strokeDasharray={e.flow ? "4 4" : "3 4"} className={e.flow ? "plan-flow" : undefined} />
          <path d={e.head} />
        </g>
      ))}
    </svg>
  );
}
