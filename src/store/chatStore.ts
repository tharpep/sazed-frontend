import { create } from "zustand";
import type { Message } from "../mock/data";
import { postMessage } from "../api/chat";
import { getConversation } from "../api/conversations";
import type { RawMessage, RawContentBlock } from "../api/conversations";
import { toolUseToToolCall } from "../lib/toolMap";
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
    set((s) => ({
      messages: [
        ...s.messages,
        { role: "user", content: trimmed },
      ],
    }));
    set({ isStreaming: true });
    try {
      const res = await postMessage({
        session_id: sessionId ?? undefined,
        message: trimmed,
      });
      set((s) => ({
        sessionId: res.session_id,
        messages: [
          ...s.messages,
          { role: "assistant", content: res.response },
        ],
        isStreaming: false,
      }));
      useSessionStore.getState().loadSessions();
    } catch (err) {
      set({
        isStreaming: false,
        messages: [
          ...get().messages,
          {
            role: "assistant",
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      });
    }
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