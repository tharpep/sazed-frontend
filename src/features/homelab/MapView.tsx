import { useState } from "react";

import { cn } from "@/lib/utils";
import type { ArchMap, MapNode } from "@/api/homelab";
import { MapPanel } from "./MapPanel";
import { useMapTraffic } from "./mapTraffic";
import { MAP_W, STATUS_COLOR, boxOf, edgeKey, edgePath, flowSeconds, homelabFrame, mapHeight } from "./mapGeometry";
import "./map.css";

interface Props {
  map: ArchMap;
  onOpenService: (serviceId: string) => void;
}

/** The architecture map: every piece of Sazed and the homelab, drawn from the gateway's
 * registry/map.yaml, with live health dots and lines that move with real traffic. */
export function MapView({ map, onOpenService }: Props) {
  const [selected, setSelected] = useState("sazed");
  const traffic = useMapTraffic(map);
  const byId = Object.fromEntries(map.nodes.map((n) => [n.id, n])) as Record<string, MapNode>;
  const frame = homelabFrame(map);
  const height = mapHeight(map);
  const services = map.nodes.flatMap((n) => n.services);
  const checked = services.filter((s) => s.up !== null);
  const up = checked.filter((s) => s.up).length;
  const selectedNode = byId[selected] ?? map.nodes[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-muted">
        <span className="flex items-center gap-1.5 text-ink">
          <span
            className={cn("size-2 rounded-full", traffic.live ? "map-pulse" : "")}
            style={{ background: traffic.live ? STATUS_COLOR.up : STATUS_COLOR.unknown }}
            aria-hidden="true"
          />
          {traffic.live ? "Live" : "Connecting…"}
        </span>
        <span className={cn(up < checked.length && "text-destructive")}>
          {up} of {checked.length} up
        </span>
        {(["up", "down", "maintenance"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[k] }} aria-hidden="true" />
            {k === "up" ? "healthy" : k}
          </span>
        ))}
        <span className="sm:ml-auto">Line speed = traffic</span>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <svg
          viewBox={`0 0 ${MAP_W} ${height}`}
          className="w-full min-w-[620px]"
          role="img"
          aria-label="Architecture map with live health and traffic"
        >
          <defs>
            <marker id="map-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#888780" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
          {frame && (
            <>
              <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} rx={16} fill="none" stroke="var(--color-border)" strokeWidth={0.75} strokeDasharray="4 4" />
              <text x={frame.x + 14} y={frame.y + 18} fontSize={12} fill="var(--color-muted)">
                Homelab · Proxmox · tailnet only
              </text>
            </>
          )}

          {map.edges.map((e) => {
            const a = byId[e.from];
            const b = byId[e.to];
            if (!a || !b) return null;
            const d = edgePath(map, boxOf(map, a), boxOf(map, b), e.route);
            const key = edgeKey(e);
            const count = traffic.counts[key] ?? 0;
            const hot = traffic.hot.has(key);
            const down = a.status === "down" || b.status === "down";
            const external = a.kind === "external" || b.kind === "external";
            const color = down ? STATUS_COLOR.down : external ? "#888780" : "#7F77DD";
            return (
              <g key={key}>
                <path d={d} fill="none" stroke="var(--color-border)" strokeWidth={0.75} markerEnd="url(#map-arrow)" />
                <path
                  d={d}
                  className={cn("map-flow", hot && "is-hot")}
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={hot || count > 0 || down ? 1 : 0.45}
                  style={{ ["--map-dur" as string]: `${hot ? 0.5 : flowSeconds(count, e.quiet)}s` }}
                />
              </g>
            );
          })}

          {map.nodes.map((n) => {
            const b = boxOf(map, n);
            return (
              <g
                key={n.id}
                className={cn(
                  "map-node",
                  n.kind === "homelab" ? "map-homelab" : "map-plain",
                  !n.placed && "map-unplaced",
                  selected === n.id && "is-selected"
                )}
                onClick={() => setSelected(n.id)}
                role="button"
                aria-label={`${n.label}${n.status ? `, ${n.status}` : ""}`}
              >
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} />
                <text className="map-title" x={b.x + 10} y={b.y + 18} dominantBaseline="central">
                  {n.label}
                </text>
                {n.sub && (
                  <text className="map-sub" x={b.x + 10} y={b.y + 34} dominantBaseline="central">
                    {n.sub}
                  </text>
                )}
                {n.status && (
                  <circle
                    cx={b.x + b.w - 10}
                    cy={b.y + 12}
                    r={4}
                    className={n.status === "down" ? "map-pulse" : undefined}
                    fill={n.status === "unknown" ? "none" : STATUS_COLOR[n.status]}
                    stroke={n.status === "unknown" ? STATUS_COLOR.unknown : "none"}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {selectedNode && (
        <MapPanel node={selectedNode} map={map} traffic={traffic} onOpenService={onOpenService} />
      )}
    </div>
  );
}
