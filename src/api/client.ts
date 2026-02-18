const BASE =
  (import.meta.env.VITE_SAZED_URL as string | undefined) || "http://localhost:8000";
const KEY = (import.meta.env.VITE_API_KEY as string | undefined) || "";

export async function apiFetch(path: string, options?: RequestInit): Promise<unknown> {
  const url = path.startsWith("http") ? path : `${BASE.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
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
  if (KEY) {
    headers["X-API-Key"] = KEY;
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
