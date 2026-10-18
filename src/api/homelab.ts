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
  depends_on: string[];
  repo: string | null;
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
