import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StreamCallbacks } from "@/api/chat";
import type { GetConversationResponse } from "@/api/conversations";

const api = vi.hoisted(() => ({
  getConversation: vi.fn(),
  listConversations: vi.fn(async () => ({ conversations: [] })),
  postMessageStream: vi.fn(),
  postEditMessageStream: vi.fn(),
}));

vi.mock("@/api/conversations", () => ({ getConversation: api.getConversation, listConversations: api.listConversations }));
vi.mock("@/api/chat", () => ({ postMessageStream: api.postMessageStream, postEditMessageStream: api.postEditMessageStream }));

import { useChatStore } from "./chatStore";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function conversation(id: string): GetConversationResponse {
  return { session_id: id, message_count: 1, messages: [{ role: "user", content: `from ${id}`, timestamp: "" }] };
}

interface Stream {
  callbacks: StreamCallbacks;
  signal: AbortSignal;
}

let streams: Stream[];
const initial = useChatStore.getState();

beforeEach(() => {
  streams = [];
  api.getConversation.mockReset();
  api.postMessageStream.mockReset();
  api.postMessageStream.mockImplementation((_body: unknown, callbacks: StreamCallbacks, signal: AbortSignal) => {
    streams.push({ callbacks, signal });
    return new Promise(() => undefined);
  });
  useChatStore.setState(initial, true);
});

describe("loadSession", () => {
  it("ignores a response that a newer load has superseded", async () => {
    const a = deferred<GetConversationResponse>();
    const b = deferred<GetConversationResponse>();
    api.getConversation.mockImplementation((id: string) => (id === "a" ? a.promise : b.promise));
    const loadA = useChatStore.getState().loadSession("a");
    const loadB = useChatStore.getState().loadSession("b");
    b.resolve(conversation("b"));
    await loadB;
    a.resolve(conversation("a"));
    await loadA;
    const s = useChatStore.getState();
    expect(s.sessionId).toBe("b");
    expect(s.messages).toEqual([{ role: "user", content: "from b" }]);
    expect(s.loadingSessionId).toBeNull();
  });

  it("drops a pending load when a new chat starts", async () => {
    const a = deferred<GetConversationResponse>();
    api.getConversation.mockReturnValue(a.promise);
    const load = useChatStore.getState().loadSession("a");
    useChatStore.getState().newSession();
    a.resolve(conversation("a"));
    await load;
    expect(useChatStore.getState().sessionId).toBeNull();
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it("ignores a stale failure", async () => {
    const a = deferred<GetConversationResponse>();
    api.getConversation.mockImplementation((id: string) => (id === "a" ? a.promise : Promise.resolve(conversation("b"))));
    const loadA = useChatStore.getState().loadSession("a");
    await useChatStore.getState().loadSession("b");
    a.reject(new Error("gone"));
    await loadA;
    expect(useChatStore.getState().sessionLoadError).toBeNull();
    expect(useChatStore.getState().sessionId).toBe("b");
  });

  it("aborts a running stream and ignores its late events", async () => {
    useChatStore.setState({ sessionId: "a" });
    void useChatStore.getState().send("hello");
    const [stream] = streams;
    api.getConversation.mockResolvedValue(conversation("b"));
    await useChatStore.getState().loadSession("b");
    expect(stream.signal.aborted).toBe(true);
    stream.callbacks.onText("late");
    stream.callbacks.onSession("a");
    stream.callbacks.onDone();
    const s = useChatStore.getState();
    expect(s.sessionId).toBe("b");
    expect(s.messages).toEqual([{ role: "user", content: "from b" }]);
    expect(s.isStreaming).toBe(false);
  });

  it("aborts a stream a send started during the load, when the load lands", async () => {
    useChatStore.setState({ sessionId: "a" });
    const b = deferred<GetConversationResponse>();
    api.getConversation.mockReturnValue(b.promise);
    const load = useChatStore.getState().loadSession("b");
    void useChatStore.getState().send("too soon");
    const [stream] = streams;
    b.resolve(conversation("b"));
    await load;
    expect(stream.signal.aborted).toBe(true);
    stream.callbacks.onText("reply meant for a");
    expect(useChatStore.getState().messages).toEqual([{ role: "user", content: "from b" }]);
    expect(useChatStore.getState().controller).toBeNull();
  });
});
