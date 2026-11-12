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
import { ViewPicker } from "@/components/shell/ViewPicker";
import { useShellStore } from "@/nav/shellFlag";
import { SUB_CHOICES, useNavStore, useSub, type SubValue } from "@/store/navStore";
import { useUiStore } from "@/store/uiStore";
import { DependenciesView } from "./DependenciesView";
import { MapView } from "./MapView";
import { ServiceSheet } from "./ServiceSheet";
import { StorageCard } from "./StorageCard";
import { StatusDot, age, gib, pct, selectedService, statusLine, statusOf, uptime, visibleServices } from "./format";

const REFRESH_MS = 30_000; // the gateway polls every 60s; 30s keeps the page within one cycle

type View = SubValue<"system:homelab">;

const VIEW_LABEL: Record<View, string> = { map: "Map", list: "List", storage: "Storage", links: "Links" };
const VIEW_HINT: Record<View, string> = {
  map: "Services as a graph",
  list: "Every service with its health",
  storage: "Pools and space for media",
  links: "What depends on what",
};
// The old shell's segmented control keeps its order until slice 13 deletes that shell.
const OLD_SHELL_ORDER: View[] = ["map", "links", "list", "storage"];

/** Open the Homelab page on a given view (Home's glance tiles): it starts on the stored one. */
export function rememberHomelabView(v: View) {
  useNavStore.getState().setSub("system:homelab", v);
}

function clearOpenService() {
  useNavStore.setState((s) => {
    if (s.open.system?.kind !== "service") return {};
    const open = { ...s.open };
    delete open.system;
    return { open };
  });
}

// A service the hub shell left open must not pop up on the old shell's next Homelab visit; the old
// shell takes a stored service only from a palette pick made while it is the shell.
useShellStore.subscribe((s, prev) => {
  if (s.shell === "old" && prev.shell !== "old") clearOpenService();
});

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
  const [now, setNow] = useState(() => Date.now());
  const view = useSub("system:homelab");
  const [map, setMap] = useState<ArchMap | null>(null);
  const privateRevealed = useUiStore((s) => s.privateRevealed);
  const hubs = useShellStore((s) => s.shell) === "hubs";
  const navOpen = useNavStore((s) => s.open.system);
  const [oldShellId, setOldShellId] = useState<string | null>(null);

  function chooseView(v: View) {
    useNavStore.getState().setSub("system:homelab", v);
  }

  // The hub shell keeps the open service in navStore, so it is still open when Pryce comes back to
  // System. The old shell drops it on leaving the page, as before; it only takes the palette's
  // pick from the store (the module-level subscription below clears anything the hub shell left).
  useEffect(() => {
    if (hubs || navOpen?.kind !== "service") return;
    setOldShellId(navOpen.id);
    clearOpenService();
  }, [hubs, navOpen]);
  const selectedId = hubs ? (navOpen?.kind === "service" ? navOpen.id : null) : oldShellId;
  const openService = (id: string) =>
    hubs ? useNavStore.getState().openItem({ kind: "service", id }) : setOldShellId(id);
  const closeService = () => (hubs ? clearOpenService() : setOldShellId(null));

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

  const shown = useMemo(() => visibleServices(data?.services ?? [], privateRevealed), [data, privateRevealed]);
  const shownMap = useMemo(
    () =>
      map && !privateRevealed
        ? { ...map, nodes: map.nodes.map((n) => ({ ...n, services: n.services.filter((s) => !s.private) })) }
        : map,
    [map, privateRevealed]
  );

  const grouped = useMemo(() => {
    const services = shown;
    return GROUPS.map((g) => ({
      ...g,
      services: services
        .filter((s) => s.group === g.key)
        .map((s, i) => ({ s, i }))
        .sort((a, b) => RANK[statusOf(a.s)] - RANK[statusOf(b.s)] || a.i - b.i)
        .map(({ s }) => s),
    })).filter((g) => g.services.length > 0);
  }, [shown]);

  const down = shown.filter((s) => statusOf(s) === "down");
  const checked = shown.filter((s) => s.lifecycle !== "planned").length;
  const { service: selected, stale } = selectedService(data?.services ?? null, selectedId, privateRevealed);
  useEffect(() => {
    if (stale) closeService();
  }, [stale]);

  const refresh = (
    <button
      type="button"
      onClick={load}
      disabled={loading}
      aria-label="Refresh"
      title="Refresh"
      className={cn(
        "flex items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-50",
        hubs ? "size-11 flex-none sm:size-9" : "size-9"
      )}
    >
      <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
    </button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      {!hubs && (
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-ink">Homelab</h1>
            <div role="tablist" aria-label="View" className="flex gap-1 rounded-md bg-surface p-0.5">
              {OLD_SHELL_ORDER.map((v) => (
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
                  {VIEW_LABEL[v]}
                </button>
              ))}
            </div>
          </div>
          {refresh}
        </header>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn("mx-auto flex w-full flex-col gap-5 px-4 py-4 pb-8", view === "map" || view === "links" ? "max-w-3xl" : "max-w-2xl")}>
          {hubs && (
            <div className="-mb-2 flex min-w-0 items-center gap-2">
              <ViewPicker
                title="Homelab"
                choices={SUB_CHOICES["system:homelab"].map((v) => ({ id: v, label: VIEW_LABEL[v], hint: VIEW_HINT[v] }))}
                value={view}
                onChange={(id) => chooseView(id as View)}
              />
              <span className="flex-1" />
              {refresh}
            </div>
          )}
          {view === "map" && shownMap && <MapView map={shownMap} onOpenService={openService} />}
          {view === "map" && !map && !error && <p className="text-sm text-muted">Loading the map…</p>}
          {view === "links" && data && <DependenciesView services={shown} onOpenService={openService} />}
          {view === "storage" && <StorageCard full />}
          {view !== "storage" && error && !data && (
            <p className="text-sm text-destructive">Couldn't load services: {error}</p>
          )}
          {view !== "storage" && !data && !error && <p className="text-sm text-muted">Loading…</p>}

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
                    .map((s) =>
                      s.used_bytes != null && s.total_bytes
                        ? `${s.name} ${gib(s.total_bytes - s.used_bytes)} GB free of ${gib(s.total_bytes)}`
                        : `${s.name} ${pct(s.used_bytes, s.total_bytes)}`
                    )
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
                  <ServiceRow key={s.id} service={s} now={now} onOpen={() => openService(s.id)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <ServiceSheet
        service={selected}
        allServices={data?.services ?? []}
        onClose={closeService}
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
