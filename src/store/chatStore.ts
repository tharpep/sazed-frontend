import { create } from "zustand";
import type { Message } from "../mock/data";
import { postMessageStream } from "../api/chat";
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
      const textParts: string[] = [];
      const toolCalls: Message["tools"] = [];
      for (const block of row.content) {
        if (block.type === "text" && block.text) textParts.push(block.text);
        if (block.type === "tool_use" && block.name) {
          toolCalls.push(
            toolUseToToolCall({ name: block.name, id: block.id, input: block.input })
          );
        }
      }
      result.push({
        role: "assistant",
        content: textParts.join("\n") || "No response.",
        tools: toolCalls.length > 0 ? toolCalls : undefined,
      });
    }
  }
  return result;
}

interface ChatState {
  sessionId: string | null;
  messages: Message[];
  isStreaming: boolean;
  send: (text: string) => Promise<void>;
  newSession: () => void;
  loadSession: (id: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessionId: null,
  messages: [],
  isStreaming: false,
  send: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { sessionId } = get();

    // Push user message and empty assistant placeholder immediately
    set((s) => ({
      messages: [
        ...s.messages,
        { role: "user" as const, content: trimmed },
        { role: "assistant" as const, content: "" },
      ],
      isStreaming: true,
    }));

    await postMessageStream(
      { session_id: sessionId ?? undefined, message: trimmed, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      {
        onSession: (id) => set({ sessionId: id }),

        onToolStart: (name) => {
          set((s) => {
            const messages = [...s.messages];
            const last = { ...messages[messages.length - 1] };
            last.tools = [...(last.tools ?? []), toolCallPending(name)];
            messages[messages.length - 1] = last;
            return { messages };
          });
        },

        onToolDone: (name) => {
          const label = name.replace(/_/g, " ");
          set((s) => {
            const messages = [...s.messages];
            const last = { ...messages[messages.length - 1] };
            let marked = false;
            last.tools = (last.tools ?? []).map((t) => {
              if (!marked && t.label === label && !t.done) {
                marked = true;
                return { ...t, done: true };
              }
              return t;
            });
            messages[messages.length - 1] = last;
            return { messages };
          });
        },

        onText: (delta) => {
          set((s) => {
            const messages = [...s.messages];
            const last = { ...messages[messages.length - 1] };
            last.content = last.content + delta;
            messages[messages.length - 1] = last;
            return { messages };
          });
        },

        onDone: () => {
          set({ isStreaming: false });
          useSessionStore.getState().loadSessions();
        },

        onError: (err) => {
          set((s) => {
            const messages = [...s.messages];
            messages[messages.length - 1] = {
              role: "assistant",
              content: `Error: ${err.message}`,
            };
            return { messages, isStreaming: false };
          });
        },
      }
    );
  },
  newSession: () => {
    set({ sessionId: null, messages: [], isStreaming: false });
    useSessionStore.setState({ activeSessionId: null });
  },
  loadSession: async (id: string) => {
    try {
      const res = await getConversation(id);
      const messages = rawMessagesToMessages(res.messages);
      set({ sessionId: id, messages });
    } catch {
      // Sazed offline or session not found — leave current messages unchanged
    }
  },
}));