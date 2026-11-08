import { apiFetch } from "./client";

export interface McpServerValues {
  transport: "http" | "stdio";
  url: string | null;
  command: string | null;
  args: string[];
  headers: Record<string, string>;
  agent_safe: boolean;
  description: string;
}

export interface McpServer extends McpServerValues {
  name: string;
  version: number;
  updated_by: string;
  updated_at: string;
}

export interface McpServerVersion {
  version: number;
  author: string;
  reason: string;
  at: string;
  server: McpServerValues;
}

export interface McpServerDetail extends McpServer {
  history: McpServerVersion[];
}

export const SERVER_NAME_PATTERN = /^[a-z][a-z0-9_-]{0,30}$/;
export const HEADER_REF_PATTERN = /^\$\{[A-Z][A-Z0-9_]*\}$/;

const AUTHOR = "pryce";
const path = (name: string) => `/agents/mcp-servers/${encodeURIComponent(name)}`;

export function listMcpServers(): Promise<McpServer[]> {
  return apiFetch("/agents/mcp-servers") as Promise<McpServer[]>;
}

export function getMcpServer(name: string): Promise<McpServerDetail> {
  return apiFetch(path(name)) as Promise<McpServerDetail>;
}

export function saveMcpServer(
  name: string,
  values: McpServerValues,
  reason: string,
  expectedVersion: number | null
): Promise<McpServer> {
  return apiFetch(path(name), {
    method: "PUT",
    body: JSON.stringify({ ...values, author: AUTHOR, reason, expected_version: expectedVersion }),
  }) as Promise<McpServer>;
}

export function deleteMcpServer(name: string, reason: string): Promise<unknown> {
  return apiFetch(`${path(name)}?author=${AUTHOR}&reason=${encodeURIComponent(reason)}`, { method: "DELETE" });
}
