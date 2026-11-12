import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GetConversationResponse } from "@/api/conversations";

const api = vi.hoisted(() => ({
  getConversation: vi.fn(),
  listConversations: vi.fn(async () => ({ conversations: [] })),
}));

vi.mock("@/api/conversations", () => ({ getConversation: api.getConversation, listConversations: api.listConversations }));

import { useShellStore } from "@/nav/shellFlag";
import { useChatStore } from "@/store/chatStore";
import { useNavStore } from "@/store/navStore";
import { useSessionStore, type ChatSession } from "@/store/sessionStore";
import { conversationItems, openSession, startNewChat, startSessionSync } from "./openSession";

const chatInitial = useChatStore.getState();
const sessionInitial = useSessionStore.getState();

function session(id: string, title: string): ChatSession {
  return { id, title, time: "3:02 PM", shortTime: "3:02 PM", dateGroup: "Today" };
}

function conversation(id: string): GetConversationResponse {
  return { session_id: id, message_count: 1, messages: [{ role: "user", content: `from ${id}`, timestamp: "" }] };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const openChat = () => useNavStore.getState().open.chat?.id;

let stop: () => void;

beforeEach(() => {
  api.getConversation.mockReset();
  api.getConversation.mockImplementation(async (id: string) => conversation(id));
  useChatStore.setState(chatInitial, true);
  useSessionStore.setState(sessionInitial, true);
  useNavStore.setState({ hub: "home", open: {}, read: {}, recent: [] });
  useShellStore.setState({ shell: "hubs" });
  stop = startSessionSync();
});

afterEach(() => stop());

describe("the open conversation in the hub shell", () => {
  it("opens a session in Chat and loads it once", async () => {
    openSession("a");
    const nav = useNavStore.getState();
    expect(nav.hub).toBe("chat");
    expect(nav.view.chat).toBe("conversation");
    expect(openChat()).toBe("a");
    expect(nav.recent[0]).toEqual({ kind: "session", id: "a" });
    expect(useChatStore.getState().loadingSessionId).toBe("a");
    await vi.waitFor(() => expect(useChatStore.getState().sessionId).toBe("a"));
    expect(api.getConversation).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().activeSessionId).toBe("a");
  });

  it("loads a session the palette opened through navStore alone", async () => {
    useNavStore.getState().openItem({ kind: "session", id: "b" });
    await vi.waitFor(() => expect(useChatStore.getState().sessionId).toBe("b"));
  });

  it("does not reload the conversation already on screen", () => {
    useChatStore.setState({ sessionId: "a" });
    useNavStore.getState().openItem({ kind: "session", id: "a" });
    expect(api.getConversation).not.toHaveBeenCalled();
  });

  it("cancels a pending load when the conversation on screen is picked again", async () => {
    useChatStore.setState({ sessionId: "a" });
    const b = deferred<GetConversationResponse>();
    api.getConversation.mockReturnValue(b.promise);
    openSession("b");
    openSession("a");
    expect(useChatStore.getState().loadingSessionId).toBeNull();
    b.resolve(conversation("b"));
    await b.promise;
    await Promise.resolve();
    expect(useChatStore.getState().sessionId).toBe("a");
    expect(openChat()).toBe("a");
  });

  it("names a new chat's session once its reply arrives, without navigating", () => {
    useNavStore.setState({ hub: "work" });
    useChatStore.setState({ sessionId: "new" });
    expect(openChat()).toBe("new");
    expect(useNavStore.getState().hub).toBe("work");
    expect(useNavStore.getState().recent).toEqual([]);
  });

  it("names the previous conversation again when a load fails", async () => {
    useChatStore.setState({ sessionId: "a" });
    api.getConversation.mockRejectedValue(new Error("gone"));
    openSession("b");
    expect(openChat()).toBe("b");
    await vi.waitFor(() => expect(openChat()).toBe("a"));
    expect(useChatStore.getState().sessionId).toBe("a");
  });

  it("follows the chat store when navStore's items are cleared", () => {
    useChatStore.setState({ sessionId: "a" });
    expect(openChat()).toBe("a");
    useNavStore.getState().clearItems();
    expect(openChat()).toBe("a");
  });

  it("clears the open session for a new chat", () => {
    useChatStore.setState({ sessionId: "a" });
    startNewChat();
    const nav = useNavStore.getState();
    expect(openChat()).toBeUndefined();
    expect(nav.hub).toBe("chat");
    expect(nav.view.chat).toBe("conversation");
    expect(useChatStore.getState().sessionId).toBeNull();
  });
});

describe("startSessionSync on start", () => {
  it("writes the chat store's session into open.chat instead of loading a stale one", () => {
    stop();
    useChatStore.setState({ sessionId: "live" });
    useNavStore.setState({ open: { chat: { kind: "session", id: "stale" } } });
    stop = startSessionSync();
    expect(openChat()).toBe("live");
    expect(api.getConversation).not.toHaveBeenCalled();
  });
});

describe("openSession in the old shell", () => {
  it("loads the session itself and leaves navStore.open alone", async () => {
    // Only HubFrame runs the sync.
    stop();
    stop = () => undefined;
    useShellStore.setState({ shell: "old" });
    openSession("a");
    await vi.waitFor(() => expect(useChatStore.getState().sessionId).toBe("a"));
    expect(openChat()).toBeUndefined();
    expect(useSessionStore.getState().activeSessionId).toBe("a");
  });
});

describe("conversationItems", () => {
  beforeEach(() => {
    useSessionStore.setState({ loadSessions: vi.fn(async () => undefined), sessions: [session("a", "Seerr request")] });
  });

  it("offers each conversation title as a session item", async () => {
    expect(await conversationItems()).toEqual([
      { ref: { kind: "session", id: "a" }, label: "Seerr request", hint: "Conversation · 3:02 PM" },
    ]);
  });

  it("offers none in the old shell, which never loads from navStore.open", async () => {
    useShellStore.setState({ shell: "old" });
    expect(await conversationItems()).toEqual([]);
  });
});
