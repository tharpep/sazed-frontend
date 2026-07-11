
export interface PostMessageBody {
  session_id?: string;
  message: string;
  mode?: string;
  timezone?: string;
  location?: { latitude: number; longitude: number; accuracy?: number };
}

export interface EditMessageBody {
  session_id: string;
  message_index: number;
  message: string;
  mode?: string;
  timezone?: string;
  location?: { latitude: number; longitude: number; accuracy?: number };
}

export interface StreamCallbacks {
  onSession: (sessionId: string) => void;
  onToolStart: (name: string) => void;
  onToolDone: (name: string, status: "success" | "error", error?: string) => void;
  onText: (delta: string) => void;
  onUiBlock?: (block: { component: string; props: Record<string, unknown> }) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

async function streamRequest(
  path: string,
  body: object,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const { useSettingsStore } = await import("../store/settingsStore");
  const base = useSettingsStore.getState().getEffectiveBase() || "http://localhost:8000";
  const key = useSettingsStore.getState().getEffectiveKey();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers["X-API-Key"] = key;

  let res: Response;
  try {
    res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    // A cancelled request before the response even arrived is a clean stop, not an error —
    // whatever text had streamed so far (there may be none) stays as the final content.
    if (isAbortError(err)) {
      callbacks.onDone();
      return;
    }
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
              callbacks.onToolDone(
                data.name as string,
                data.status as "success" | "error",
                data.error as string | undefined,
              );
              break;
            case "text_delta":
              callbacks.onText(data.text as string);
              break;
            case "done":
              complete = true;
              callbacks.onDone();
              break;
            case "ui_block":
              callbacks.onUiBlock?.({
                component: data.component as string,
                props: (data.props ?? {}) as Record<string, unknown>,
              });
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
  } catch (err) {
    // Cancelled mid-stream — treat like a clean stop so the partial assistant text that
    // already rendered stays as the final content instead of flashing an error state.
    if (isAbortError(err)) {
      callbacks.onDone();
    } else {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  } finally {
    reader.releaseLock();
  }
}

export async function postMessageStream(
  body: PostMessageBody,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  return streamRequest("/chat/stream", body, callbacks, signal);
}

export async function postEditMessageStream(
  body: EditMessageBody,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  return streamRequest("/chat/edit/stream", body, callbacks, signal);
}
