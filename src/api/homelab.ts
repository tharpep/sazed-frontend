import { gatewayFetch } from "./client";

// --- Types (mirror api-gateway /homelab responses) ---

export type ServiceGroup = "sazed" | "apps" | "infra";
export type Lifecycle = "active" | "planned" | "retiring";

export interface ServiceLive {
  up: boolean | null;
  detail: string | null;
  latency_ms: number | null;
  checked_at: string | null;
  container_status: string | null;
}

export interface ServiceState {
  since: string | null;
  maintenance_until: string | null;
  in_maintenance: boolean;
  muted: boolean;
  notes: string | null;
}

export interface Service {
  id: string;
  name: string;
  group: ServiceGroup;
  container: number | null;
  lifecycle: Lifecycle;
  description: string;
  open_url: string | null;
  icon: string | null; // dashboard-icons slug, for the Apps page
  depends_on: string[];
  repo: string | null;
  private: boolean; // from the gateway's homelab-only registry file; hidden until revealed
  live: ServiceLive | null;
  state: ServiceState | null; // null when the gateway can't reach Postgres
}

export interface ServicesResponse {
  poller_running: boolean;
  last_cycle_at: string | null;
  state_available: boolean;
  summary: { up: number; down: number; unknown: number };
  services: Service[];
}

export interface ServiceEvent {
  at: string;
  up: boolean;
  detail: string | null;
  in_maintenance: boolean;
}

export interface ServiceDetail extends Service {
  events: ServiceEvent[] | null;
}

export interface HostStatus {
  cpu_percent: number;
  mem_used_bytes: number;
  mem_total_bytes: number;
  rootfs_used_bytes: number;
  rootfs_total_bytes: number;
  uptime_seconds: number;
  storage: {
    name: string;
    type: string;
    active: boolean;
    used_bytes: number | null;
    total_bytes: number | null;
  }[];
}

export interface StoragePool {
  name: string;
  type: string;
  used_bytes: number;
  total_bytes: number;
  free_bytes: number;
}

export interface LibraryTotal {
  count: number;
  bytes: number;
}

/** null sections: that source (Sonarr, Radarr, qBittorrent) isn't configured or failed.
 * Sizes and counts only; the gateway never sends titles or torrent names. */
export interface StorageResponse {
  pools: StoragePool[];
  media: {
    vmid: number;
    mount: string;
    volume: string | null;
    pool: string | null; // null for a bind mount Proxmox can't size
    free_bytes: number | null;
    series: LibraryTotal | null;
    movies: LibraryTotal | null;
    downloads: {
      torrents: number;
      bytes: number;
      not_imported: LibraryTotal; // finished torrents Sonarr/Radarr never imported
    } | null;
  };
  containers: {
    vmid: number;
    name: string;
    status: string;
    used_bytes: number | null;
    total_bytes: number | null;
  }[];
  errors: string[];
}

export interface LifecycleTask {
  type: string; // vzstart | vzstop | vzreboot | ...
  user: string;
  status: string;
  start_time: number; // epoch seconds
  end_time: number | null;
}

export interface ContainerDetail {
  vmid: number;
  name: string;
  status: string;
  recent_lifecycle: LifecycleTask[];
}

export interface ServiceStateUpdate {
  maintenance_minutes?: number; // 0 ends maintenance
  muted?: boolean;
  notes?: string;
}

// --- Calls (via the console's /gw route; Caddy adds the gateway key) ---

export function fetchServices(): Promise<ServicesResponse> {
  return gatewayFetch("/homelab/services") as Promise<ServicesResponse>;
}

export function fetchService(id: string): Promise<ServiceDetail> {
  return gatewayFetch(`/homelab/services/${encodeURIComponent(id)}`) as Promise<ServiceDetail>;
}

export function fetchHost(): Promise<HostStatus> {
  return gatewayFetch("/homelab/host") as Promise<HostStatus>;
}

export function fetchStorage(): Promise<StorageResponse> {
  return gatewayFetch("/homelab/storage") as Promise<StorageResponse>;
}

export function fetchContainer(vmid: number): Promise<ContainerDetail> {
  return gatewayFetch(`/homelab/containers/${vmid}?task_limit=10`) as Promise<ContainerDetail>;
}

export function updateServiceState(
  id: string,
  body: ServiceStateUpdate
): Promise<{ id: string; state: ServiceState }> {
  return gatewayFetch(`/homelab/services/${encodeURIComponent(id)}/state`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as Promise<{ id: string; state: ServiceState }>;
}

export function restartContainer(vmid: number): Promise<unknown> {
  return gatewayFetch(`/homelab/containers/${vmid}/restart`, { method: "POST" });
}

export function startContainer(vmid: number): Promise<unknown> {
  return gatewayFetch(`/homelab/containers/${vmid}/start`, { method: "POST" });
}

/** Gateway errors arrive as `{"detail": "..."}` text in the thrown Error; show just the detail. */
export function errorText(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    /* not JSON */
  }
  return raw || "Something went wrong";
}

// --- Architecture map (gateway registry/map.yaml, served with live health) ---

export type MapNodeKind = "client" | "homelab" | "external";
export type MapStatus = "up" | "down" | "maintenance" | "unknown";

export interface MapSignal {
  kind: string;
  title: string | null;
  agent: string | null;
}

export interface MapNodeService {
  id: string;
  name: string;
  up: boolean | null;
  detail: string | null;
  since: string | null;
  in_maintenance: boolean;
  muted: boolean;
  container: number | null;
  private: boolean;
}

export interface MapContainer {
  vmid: number;
  name: string;
  status: string;
  cpu_percent: number;
  mem_used_bytes: number;
  mem_total_bytes: number;
  disk_used_bytes: number | null; // root disk only; extra mount points aren't reported
  disk_total_bytes: number | null;
  uptime_seconds: number;
}

export interface MapNode {
  id: string;
  label: string;
  sub: string | null;
  kind: MapNodeKind;
  col: number;
  row: number;
  status: MapStatus | null;
  services: MapNodeService[];
  containers: MapContainer[];
  placed: boolean;
}

export interface MapEdge {
  from: string;
  to: string;
  signals: MapSignal[];
  quiet: boolean;
  route: "over" | null;
}

export interface ArchMap {
  layout: { columns: { x: number; w: number }[]; row_height: number; top: number };
  nodes: MapNode[];
  edges: MapEdge[];
  generated_at: string;
}

export function fetchMap(): Promise<ArchMap> {
  return gatewayFetch("/homelab/map") as Promise<ArchMap>;
}
