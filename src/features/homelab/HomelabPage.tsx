import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ExternalLink, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  errorText,
  fetchHost,
  fetchMap,
  fetchServices,
  type ArchMap,
  type HostStatus,
  type Service,
  type ServiceGroup,
  type ServicesResponse,
} from "@/api/homelab";
import { MapView } from "./MapView";
import { ServiceSheet } from "./ServiceSheet";
import { StatusDot, age, gib, pct, statusLine, statusOf, uptime } from "./format";

const REFRESH_MS = 30_000; // the gateway polls every 60s; 30s keeps the page within one cycle
const VIEW_KEY = "sazed-homelab-view";

type View = "map" | "list";

function savedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "map";
  } catch {
    return "map";
  }
}

const GROUPS: { key: ServiceGroup; label: string }[] = [
  { key: "sazed", label: "Sazed" },
  { key: "apps", label: "Apps" },
  { key: "infra", label: "Infrastructure" },
];

// Problems first within a group, then registry order.
const RANK = { down: 0, maintenance: 1, unknown: 2, up: 3, planned: 4 } as const;

export function HomelabPage() {
  const [data, setData] = useState<ServicesResponse | null>(null);
  const [host, setHost] = useState<HostStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState<View>(savedView);
  const [map, setMap] = useState<ArchMap | null>(null);

  function chooseView(v: View) {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // private mode: the choice just isn't remembered
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    const [services, hostResult, mapResult] = await Promise.allSettled([
      fetchServices(),
      fetchHost(),
      fetchMap(),
    ]);
    if (services.status === "fulfilled") {
      setData(services.value);
      setError(null);
    } else {
      setError(errorText(services.reason));
    }
    // Host stats are a nice-to-have; a Proxmox hiccup shouldn't blank the page.
    if (hostResult.status === "fulfilled") setHost(hostResult.value);
    if (mapResult.status === "fulfilled") setMap(mapResult.value);
    setNow(Date.now());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const grouped = useMemo(() => {
    const services = data?.services ?? [];
    return GROUPS.map((g) => ({
      ...g,
      services: services
        .filter((s) => s.group === g.key)
        .map((s, i) => ({ s, i }))
        .sort((a, b) => RANK[statusOf(a.s)] - RANK[statusOf(b.s)] || a.i - b.i)
        .map(({ s }) => s),
    })).filter((g) => g.services.length > 0);
  }, [data]);

  const down = (data?.services ?? []).filter((s) => statusOf(s) === "down");
  const checked = (data?.services ?? []).filter((s) => s.lifecycle !== "planned").length;
  const selected = data?.services.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-ink">Homelab</h1>
          <div role="tablist" aria-label="View" className="flex gap-1 rounded-md bg-surface p-0.5">
            {(["map", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => chooseView(v)}
                className={cn(
                  "rounded px-2.5 py-0.5 text-sm transition-colors",
                  view === v ? "bg-bg font-medium text-ink shadow-sm" : "text-muted hover:text-ink"
                )}
              >
                {v === "map" ? "Map" : "List"}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Refresh"
          title="Refresh"
          className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn("mx-auto flex w-full flex-col gap-5 px-4 py-4 pb-8", view === "map" ? "max-w-3xl" : "max-w-2xl")}>
          {view === "map" && map && <MapView map={map} onOpenService={setSelectedId} />}
          {view === "map" && !map && !error && <p className="text-sm text-muted">Loading the map…</p>}
          {error && !data && <p className="text-sm text-destructive">Couldn't load services: {error}</p>}
          {!data && !error && <p className="text-sm text-muted">Loading…</p>}

          {view === "list" && data && (
            <section aria-label="Summary" className="flex flex-col gap-1">
              {down.length > 0 ? (
                <p className="text-[15px] font-medium text-destructive">
                  {down.length} down: {down.map((s) => s.name).join(", ")}
                </p>
              ) : (
                <p className="text-[15px] font-medium text-ink">All {checked} services up</p>
              )}
              <p className="text-xs text-muted">
                {data.poller_running
                  ? age(data.last_cycle_at, now)
                    ? `Checked ${age(data.last_cycle_at, now)} ago`
                    : "Checked just now"
                  : "Health checks aren't running on the gateway"}
                {!data.state_available && " · history unavailable (database unreachable)"}
                {error && ` · refresh failed: ${error}`}
              </p>
              {host && (
                <p className="text-xs text-muted">
                  CPU {host.cpu_percent}% · Memory {gib(host.mem_used_bytes)} /{" "}
                  {gib(host.mem_total_bytes)} GB · Storage{" "}
                  {host.storage
                    .filter((s) => s.active)
                    .map((s) => `${s.name} ${pct(s.used_bytes, s.total_bytes)}`)
                    .join(", ")}{" "}
                  · Up {uptime(host.uptime_seconds)}
                </p>
              )}
            </section>
          )}

          {view === "list" && grouped.map((group) => (
            <section key={group.key} aria-labelledby={`homelab-${group.key}`}>
              <h2 id={`homelab-${group.key}`} className="px-1 pb-1.5 text-sm font-medium text-muted">
                {group.label}
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {group.services.map((s) => (
                  <ServiceRow key={s.id} service={s} now={now} onOpen={() => setSelectedId(s.id)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <ServiceSheet
        service={selected}
        allServices={data?.services ?? []}
        onClose={() => setSelectedId(null)}
        onChanged={load}
      />
    </div>
  );
}

function ServiceRow({ service: s, now, onOpen }: { service: Service; now: number; onOpen: () => void }) {
  const kind = statusOf(s);
  return (
    <li className="flex items-center">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface"
      >
        <StatusDot kind={kind} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm text-ink">
            {s.name}
            {s.lifecycle === "retiring" && <span className="text-muted"> · retiring</span>}
          </span>
          <span className={cn("truncate text-xs", kind === "down" ? "text-destructive" : "text-muted")}>
            {statusLine(s, now)}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
      </button>
      {s.open_url ? (
        <a
          href={s.open_url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${s.name}`}
          title={`Open ${s.name}`}
          className="flex size-11 shrink-0 items-center justify-center text-muted transition-colors hover:text-primary"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      ) : (
        // Keeps every row's chevron in the same column whether or not it has a link.
        <span className="size-11 shrink-0" aria-hidden="true" />
      )}
    </li>
  );
}
