import { create } from "zustand";
import type { Message, MessageBlock, ToolBlock, UIBlock } from "../mock/data";
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
        { role: "user" as const, content: trimmed },
        { role: "assistant" as const, content: "", blocks: [] },
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
          set({ isStreaming: false });
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
