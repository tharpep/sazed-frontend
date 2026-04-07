import { useSettingsStore } from "../store/settingsStore";

function getBase(): string {
  return useSettingsStore.getState().getEffectiveBase();
}

function getKey(): string {
  return useSettingsStore.getState().getEffectiveKey();
}

// Gateway base URL — separate service from Sazed (calendar, tasks, email, etc.)
const GATEWAY_BASE =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8001";

export async function gatewayFetch(path: string, options?: RequestInit): Promise<unknown> {
  const key = getKey();
  const url = `${GATEWAY_BASE}/${path.replace(/^\//, "")}`;
  const headers: Record<string, string> = {
    ...(typeof options?.headers === "object" && !(options.headers instanceof Headers)
      ? Object.fromEntries(
          Object.entries(options.headers).map(([k, v]) => [k, String(v)])
        )
      : {}),
  };
  const method = options?.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }
  if (key) {
    headers["X-API-Key"] = key;
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const contentType = res.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<unknown>;
  }
  return res.text();
}

export async function apiFetch(path: string, options?: RequestInit): Promise<unknown> {
  const base = getBase();
  const key = getKey();
  const url = path.startsWith("http") ? path : `${base}/${path.replace(/^\//, "")}`;
  const headers: Record<string, string> = {
    ...(typeof options?.headers === "object" && !(options.headers instanceof Headers)
      ? Object.fromEntries(
          Object.entries(options.headers).map(([k, v]) => [k, String(v)])
        )
      : {}),
  };
  const method = options?.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }
  if (key) {
    headers["X-API-Key"] = key;
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const contentType = res.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<unknown>;
  }
  return res.text();
}
