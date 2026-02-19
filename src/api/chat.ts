import { apiFetch } from "./client";

export interface PostMessageBody {
  session_id?: string;
  message: string;
}

export interface PostMessageResponse {
  session_id: string;
  response: string;
}

export interface StreamCallbacks {
  onSession: (sessionId: string) => void;
  onToolStart: (name: string) => void;
  onToolDone: (name: string) => void;
  onText: (delta: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function postMessage(
  body: PostMessageBody
): Promise<PostMessageResponse> {
  const data = await apiFetch("/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data as PostMessageResponse;
}

export async function postMessageStream(
  body: PostMessageBody,
  callbacks: StreamCallbacks
): Promise<void> {
  const base =
    (import.meta.env.VITE_SAZED_URL as string | undefined) ||
    "http://localhost:8000";
  const key = (import.meta.env.VITE_API_KEY as string | undefined) || "";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers["X-API-Key"] = key;

  let res: Response;
  try {
    res = await fetch(`${base.replace(/\/$/, "")}/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (!res.ok) {
    const text = await res.text();
    callbacks.onError(new Error(text || `HTTP ${res.status}`));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error("No response body"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let complete = false;

  try {
    while (!complete) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by double newlines
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const lines = part.trim().split("\n");
        let eventType = "";
        let dataStr = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) dataStr = line.slice(6).trim();
        }

        if (!eventType || !dataStr) continue;

        try {
          const data = JSON.parse(dataStr) as Record<string, unknown>;
          switch (eventType) {
            case "session":
              callbacks.onSession(data.session_id as string);
              break;
            case "tool_start":
              callbacks.onToolStart(data.name as string);
              break;
            case "tool_done":
              callbacks.onToolDone(data.name as string);
              break;
            case "text_delta":
              callbacks.onText(data.text as string);
              break;
            case "done":
              complete = true;
              callbacks.onDone();
              break;
            case "error":
              complete = true;
              callbacks.onError(new Error((data.message as string) || "Stream error"));
              break;
          }
        } catch {
          // malformed SSE chunk — skip
        }
      }
    }
    if (!complete) {
      callbacks.onError(new Error("Stream ended unexpectedly"));
    }
  } finally {
    reader.releaseLock();
  }
}
