import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useShellStore } from "@/nav/shellFlag";
import { useChatStore } from "@/store/chatStore";
import { useNavStore } from "@/store/navStore";
import { useSessionStore, type ChatSession } from "@/store/sessionStore";
import { conversationItems, openSession, startNewChat, startSessionSync } from "./openSession";

const chatActions = useChatStore.getState();
const sessionActions = useSessionStore.getState();

function session(id: string, title: string): ChatSession {
  return { id, title, time: "3:02 PM", shortTime: "3:02 PM", dateGroup: "Today" };
}

let stop: () => void;
let loadSession: ReturnType<typeof vi.fn>;
let failing: Set<string>;

beforeEach(() => {
  failing = new Set();
  loadSession = vi.fn(async (id: string) => {
    if (failing.has(id)) useChatStore.setState({ sessionLoadError: "Couldn't load that conversation." });
    else useChatStore.setState({ sessionId: id, sessionLoadError: null });
  });
  useChatStore.setState({ ...chatActions, sessionId: null, messages: [], loadSession });
  useSessionStore.setState({ ...sessionActions, sessions: [], activeSessionId: null });
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
    expect(nav.open.chat).toEqual({ kind: "session", id: "a" });
    expect(nav.recent[0]).toEqual({ kind: "session", id: "a" });
    await vi.waitFor(() => expect(useChatStore.getState().sessionId).toBe("a"));
    expect(loadSession).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().activeSessionId).toBe("a");
  });

  it("loads a session the palette opened through navStore alone", async () => {
    useNavStore.getState().openItem({ kind: "session", id: "b" });
    await vi.waitFor(() => expect(useChatStore.getState().sessionId).toBe("b"));
  });

  it("does not reload the conversation already on screen", () => {
    useChatStore.setState({ sessionId: "a" });
    useNavStore.getState().openItem({ kind: "session", id: "a" });
    expect(loadSession).not.toHaveBeenCalled();
  });

  it("names a new chat's session once its reply arrives, without navigating", () => {
    useNavStore.setState({ hub: "work" });
    useChatStore.setState({ sessionId: "new" });
    expect(useNavStore.getState().open.chat).toEqual({ kind: "session", id: "new" });
    expect(useNavStore.getState().hub).toBe("work");
    expect(useNavStore.getState().recent).toEqual([]);
  });

  it("keeps naming the previous conversation when a load fails", async () => {
    useChatStore.setState({ sessionId: "a" });
    failing.add("b");
    openSession("b");
    await vi.waitFor(() => expect(useNavStore.getState().open.chat).toEqual({ kind: "session", id: "a" }));
    expect(useChatStore.getState().sessionId).toBe("a");
  });

  it("clears the open session for a new chat", () => {
    useChatStore.setState({ sessionId: "a" });
    useNavStore.setState({ open: { chat: { kind: "session", id: "a" } } });
    startNewChat();
    const nav = useNavStore.getState();
    expect(nav.open.chat).toBeUndefined();
    expect(nav.hub).toBe("chat");
    expect(nav.view.chat).toBe("conversation");
    expect(useChatStore.getState().sessionId).toBeNull();
  });
});

describe("openSession in the old shell", () => {
  it("loads the session itself and leaves navStore.open alone", () => {
    // Only HubFrame runs the sync.
    stop();
    stop = () => undefined;
    useShellStore.setState({ shell: "old" });
    openSession("a");
    expect(loadSession).toHaveBeenCalledWith("a");
    expect(useNavStore.getState().open.chat).toBeUndefined();
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
