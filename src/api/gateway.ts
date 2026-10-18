import { gatewayFetch } from "./client";

// --- Types (mirror api-gateway /health and /health/integrations) ---

export interface IntegrationStatus {
  connected: boolean;
  status: string;
  last_check: string | null;
}

/** Keyed by integration id, e.g. google_calendar, anthropic, proxmox. */
export type Integrations = Record<string, IntegrationStatus>;

export interface GatewayEndpoint {
  path: string;
  description: string;
  provider: string | null;
}

export interface GatewayHealth {
  status: string;
  version: string;
  uptime_seconds: number;
  endpoints: GatewayEndpoint[];
}

export function fetchIntegrations(): Promise<Integrations> {
  return gatewayFetch("/health/integrations") as Promise<Integrations>;
}

export function fetchGatewayHealth(): Promise<GatewayHealth> {
  return gatewayFetch("/health") as Promise<GatewayHealth>;
}
