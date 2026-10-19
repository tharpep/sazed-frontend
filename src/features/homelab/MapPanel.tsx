import { cn } from "@/lib/utils";
import type { ArchMap, MapNode } from "@/api/homelab";
import { clock } from "@/features/activity/format";
import type { MapTraffic } from "./mapTraffic";
import { STATUS_COLOR, edgeKey, edgesFor } from "./mapGeometry";
import { gib, uptime } from "./format";

const STATUS_TEXT = { up: "Healthy", down: "Down", maintenance: "Maintenance", unknown: "Not checked yet" };

interface Props {
  node: MapNode;
  map: ArchMap;
  traffic: MapTraffic;
  onOpenService: (serviceId: string) => void;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface px-2.5 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

/** What the mockup shows under the map for the selected node: health, stats, traffic and the
 * latest activity on its lines, plus a way into the service sheet for actions. */
export function MapPanel({ node, map, traffic, onOpenService }: Props) {
  const lines = map.edges.filter((e) => e.from === node.id || e.to === node.id);
  const lineKeys = new Set(lines.map(edgeKey));
  const traffic15 = lines.reduce((sum, e) => sum + (traffic.counts[edgeKey(e)] ?? 0), 0);
  const recent = traffic.recent
    .filter((e) => edgesFor(map, e).some((edge) => lineKeys.has(edgeKey(edge))))
    .slice(0, 4);
  const facts: [string, string][] = [];
  if (node.containers.length === 1) {
    const c = node.containers[0];
    facts.push(
      ["Container", `CT ${c.vmid}`],
      ["CPU", `${c.cpu_percent}%`],
      ["Memory", `${gib(c.mem_used_bytes)} / ${gib(c.mem_total_bytes)} GB`],
      ["Uptime", uptime(c.uptime_seconds)]
    );
  } else if (node.containers.length > 1) {
    facts.push(["Containers", node.containers.map((c) => `CT ${c.vmid}`).join(", ")]);
  }
  if (node.services.length > 1) {
    facts.push(["Up", `${node.services.filter((s) => s.up).length} of ${node.services.length}`]);
  }
  facts.push(["Traffic, 15 min", `${traffic15} event${traffic15 === 1 ? "" : "s"}`]);
  const down = node.services.filter((s) => s.up === false);
  const status = node.status;

  return (
    <section aria-label={`${node.label} details`} className="rounded-xl border border-border px-4 py-3.5">
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2.5">
        <span className="text-base font-medium text-ink">{node.label}</span>
        {status && (
          <span className="text-[13px]" style={{ color: status === "up" ? STATUS_COLOR.up : STATUS_COLOR[status] }}>
            {STATUS_TEXT[status]}
          </span>
        )}
        {node.sub && <span className="text-[13px] text-muted">{node.sub}</span>}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
        {facts.map(([k, v]) => (
          <Fact key={k} label={k} value={v} />
        ))}
      </div>

      {down.length > 0 && (
        <p className="mt-2.5 text-[13px] text-destructive">
          Down: {down.map((s) => `${s.name}${s.detail ? ` (${s.detail})` : ""}`).join(", ")}
        </p>
      )}

      {recent.length > 0 && (
        <p className="mt-2.5 text-[13px] text-muted">
          Recent: {recent.map((e) => `${e.title.slice(0, 60)} (${clock(e.at)})`).join(" · ")}
        </p>
      )}

      {node.services.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {node.services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onOpenService(s.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-ink transition-colors hover:bg-surface"
              )}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: s.up === false ? STATUS_COLOR.down : s.in_maintenance ? STATUS_COLOR.maintenance : s.up ? STATUS_COLOR.up : STATUS_COLOR.unknown }}
                aria-hidden="true"
              />
              {node.services.length === 1 ? `Manage ${s.name}` : s.name}
            </button>
          ))}
        </div>
      )}
      {!node.placed && (
        <p className="mt-2.5 text-xs text-muted">
          This service is in the registry but not on the map yet. Add it to registry/map.yaml.
        </p>
      )}
    </section>
  );
}
