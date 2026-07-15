import { create } from "zustand";
import type { Message, MessageBlock, ToolBlock, UIBlock } from "../mock/data";
import { postEditMessageStream, postMessageStream } from "../api/chat";
import type { StreamCallbacks } from "../api/chat";

// Device location enriches requests but must never gate them: geolocation can
// take seconds (or sit on a permission prompt) before resolving. Request it
// once in the background and read back whatever's cached at send time instead
// of awaiting it inline, so a slow/denied prompt can't stall every message.
let _cachedLocation: { latitude: number; longitude: number; accuracy?: number } | null = null;
let _locationRequested = false;

function _requestLocationInBackground(): void {
  if (_locationRequested || !navigator.geolocation) return;
  _locationRequested = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      _cachedLocation = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? undefined,
      };
    },
    () => {
      // Denied or unavailable — leave _cachedLocation null. Not retried:
      // a stalled/dismissed prompt shouldn't reattempt on every message.
    },
    { timeout: 5000 },
  );
}

function _getLocation(): { latitude: number; longitude: number; accuracy?: number } | undefined {
  _requestLocationInBackground();
  return _cachedLocation ?? undefined;
}
import { getConversation } from "../api/conversations";
import type { RawMessage, RawContentBlock } from "../api/conversations";
import { toolUseToToolCall, toolCallPending } from "../lib/toolMap";
import { useSessionStore } from "./sessionStore";

function isRawContentBlockArray(
  content: string | RawContentBlock[]
): content is RawContentBlock[] {
  return Array.isArray(content);
}

function rawMessagesToMessages(raw: RawMessage[]): Message[] {
  const result: Message[] = [];
  for (const row of raw) {
    if (row.role === "tool") continue;
    if (row.role === "user") {
      if (typeof row.content === "string") {
        result.push({ role: "user", content: row.content });
      }
      continue;
    }
    if (row.role === "assistant" && isRawContentBlockArray(row.content)) {
      const blocks: MessageBlock[] = [];
      for (const block of row.content) {
        if (block.type === "tool_use" && block.name) {
          blocks.push({
            type: "tool",
            ...toolUseToToolCall({ name: block.name, id: block.id, input: block.input }),
          });
        }
        if (block.type === "text" && block.text) {
          blocks.push({ type: "text", content: block.text });
        }
      }
      result.push({ role: "assistant", content: "", blocks });
    }
  }
  return result;
}

interface ChatState {
  sessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  controller: AbortController | null;
  sessionLoadError: string | null;
  send: (text: string) => Promise<void>;
  stop: () => void;
  editMessage: (atIndex: number, newText: string) => Promise<void>;
  newSession: () => void;
  loadSession: (id: string) => Promise<void>;
  dismissSessionLoadError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => {
  // Shared between send() and editMessage() — the only difference between the two
  // is which endpoint kicks off the stream; the SSE event handling is identical.
  function makeCallbacks(): StreamCallbacks {
    return {
      onSession: (id) => set({ sessionId: id }),

      onToolStart: (name) => {
        set((s) => {
          const messages = [...s.messages];
          const last = { ...messages[messages.length - 1] };
          const toolBlock: ToolBlock = { type: "tool", ...toolCallPending(name) };
          last.blocks = [...(last.blocks ?? []), toolBlock];
          messages[messages.length - 1] = last;
          return { messages };
        });
      },

      onToolDone: (name, status, error) => {
        set((s) => {
          const messages = [...s.messages];
          const last = { ...messages[messages.length - 1] };
          let marked = false;
          last.blocks = (last.blocks ?? []).map((b) => {
            if (!marked && b.type === "tool" && b.name === name && !b.done) {
              marked = true;
              return { ...b, done: true, status, error };
            }
            return b;
          });
          messages[messages.length - 1] = last;
          return { messages };
        });
      },

      onText: (delta) => {
        set((s) => {
          const messages = [...s.messages];
          const last = { ...messages[messages.length - 1] };
          const blocks = [...(last.blocks ?? [])];
          const lastBlock = blocks[blocks.length - 1];
          if (lastBlock?.type === "text") {
            blocks[blocks.length - 1] = { ...lastBlock, content: lastBlock.content + delta };
          } else {
            blocks.push({ type: "text", content: delta });
          }
          last.blocks = blocks;
          messages[messages.length - 1] = last;
          return { messages };
        });
      },

      onUiBlock: ({ component, props }) => {
        set((s) => {
          const messages = [...s.messages];
          const last = { ...messages[messages.length - 1] };
          const uiBlock: UIBlock = { type: "ui", component, props };
          last.blocks = [...(last.blocks ?? []), uiBlock];
          messages[messages.length - 1] = last;
          return { messages };
        });
      },

      onDone: () => {
        set({ isStreaming: false, controller: null });
        useSessionStore.getState().loadSessions();
      },

      onError: (err) => {
        set((s) => {
          const messages = [...s.messages];
          messages[messages.length - 1] = {
            role: "assistant",
            content: `${err.message}`,
            isError: true,
          };
          return { messages, isStreaming: false, controller: null };
        });
      },
    };
  }

  return {
    sessionId: null,
    messages: [],
    isStreaming: false,
    controller: null,
    sessionLoadError: null,

    send: async (text: string) => {
      const trimmed = text.trim();
      // isStreaming guard prevents a double-click (or a rapid Enter-then-click)
      // from firing two concurrent streams into the same conversation.
      if (!trimmed || get().isStreaming) return;
      const { sessionId } = get();

      const controller = new AbortController();
      set((s) => ({
        messages: [
          ...s.messages,
          { role: "user" as const, content: trimmed },
          { role: "assistant" as const, content: "", blocks: [] },
        ],
        isStreaming: true,
        controller,
      }));

      const location = _getLocation();
      await postMessageStream(
        {
          session_id: sessionId ?? undefined,
          message: trimmed,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location,
        },
        makeCallbacks(),
        controller.signal,
      );
    },

    stop: () => {
      get().controller?.abort();
    },

    editMessage: async (atIndex: number, newText: string) => {
      const trimmed = newText.trim();
      if (!trimmed || get().isStreaming) return;
      const { sessionId, messages } = get();
      if (!sessionId) return;
      if (messages[atIndex]?.role !== "user") return;

      // Backend counts only real user-text messages (0-based) when resolving which
      // message to replace — this must match rawMessagesToMessages' filtering exactly.
      const messageIndex = messages.slice(0, atIndex + 1).filter((m) => m.role === "user").length - 1;

      const controller = new AbortController();
      set({
        messages: [
          ...messages.slice(0, atIndex),
          { role: "user" as const, content: trimmed },
          { role: "assistant" as const, content: "", blocks: [] },
        ],
        isStreaming: true,
        controller,
      });

      const location = _getLocation();
      await postEditMessageStream(
        {
          session_id: sessionId,
          message_index: messageIndex,
          message: trimmed,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location,
        },
        makeCallbacks(),
        controller.signal,
      );
    },

    newSession: () => {
      get().controller?.abort();
      set({ sessionId: null, messages: [], isStreaming: false, controller: null, sessionLoadError: null });
      useSessionStore.setState({ activeSessionId: null });
    },

    loadSession: async (id: string) => {
      // Abort any in-flight stream from the conversation we're leaving —
      // otherwise its callbacks keep firing after the switch and mutate
      // whatever conversation just loaded (they index off "the last message",
      // which is now a different conversation's last message).
      get().controller?.abort();
      try {
        const res = await getConversation(id);
        const messages = rawMessagesToMessages(res.messages);
        set({
          sessionId: id,
          messages,
          isStreaming: false,
          controller: null,
          sessionLoadError: null,
        });
      } catch (err) {
        set({
          sessionLoadError:
            err instanceof Error ? err.message : "Couldn't load that conversation.",
        });
      }
    },

    dismissSessionLoadError: () => set({ sessionLoadError: null }),
  };
});
