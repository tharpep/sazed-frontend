import type { PaletteItem } from "@/nav/paletteSources";
import { useShellStore } from "@/nav/shellFlag";
import { useChatStore } from "@/store/chatStore";
import { useNavStore } from "@/store/navStore";
import { useSessionStore } from "@/store/sessionStore";

/** Writes the open conversation without navigating: navStore.openItem would also switch to Chat
 * and add the conversation to Recent. */
function setOpenSession(id: string | null) {
  const open = { ...useNavStore.getState().open };
  if (id) open.chat = { kind: "session", id };
  else delete open.chat;
  useNavStore.setState({ open });
}

/** Opens a conversation in Chat, from anywhere. */
export function openSession(id: string) {
  useSessionStore.getState().selectSession(id);
  if (useShellStore.getState().shell === "old") void useChatStore.getState().loadSession(id);
}

/** Clears the open conversation and shows an empty one in Chat. */
export function startNewChat() {
  useChatStore.getState().newSession();
  setOpenSession(null);
  useNavStore.getState().go("chat", "conversation");
}

/** In the hub shell, navStore.open.chat names the conversation Chat shows. This keeps chatStore
 * and it in step: opening a session (a list row, the palette, Recent, Activity) loads it, and a
 * new chat's first reply, a new chat or a failed load writes back. Returns the unsubscribe. */
export function startSessionSync(): () => void {
  async function load(id: string) {
    useSessionStore.setState({ activeSessionId: id });
    if (id === useChatStore.getState().sessionId) return;
    await useChatStore.getState().loadSession(id);
    // A failed load keeps the previous conversation on screen, so the shell must name that one.
    const shown = useChatStore.getState().sessionId;
    if (shown !== id && useNavStore.getState().open.chat?.id === id) setOpenSession(shown);
  }

  const initial = useNavStore.getState().open.chat?.id;
  if (initial) void load(initial);

  const offNav = useNavStore.subscribe((s, prev) => {
    const id = s.open.chat?.id;
    if (id && id !== prev.open.chat?.id) void load(id);
  });
  const offChat = useChatStore.subscribe((s, prev) => {
    if (s.sessionId === prev.sessionId) return;
    if (useNavStore.getState().open.chat?.id !== (s.sessionId ?? undefined)) setOpenSession(s.sessionId);
  });
  return () => {
    offNav();
    offChat();
  };
}

/** The open conversation's title for the shell: "New chat" with none open, undefined until the
 * session list has loaded. */
export function useOpenChatTitle(): string | undefined {
  const openId = useNavStore((s) => s.open.chat?.id);
  return useSessionStore((s) => (openId ? s.sessions.find((x) => x.id === openId)?.title : "New chat"));
}

/** Conversation titles for the command palette, from the same list the Chats page shows. Only the
 * hub shell loads a conversation from navStore.open.chat, so the old shell gets none. */
export async function conversationItems(): Promise<PaletteItem[]> {
  if (useShellStore.getState().shell !== "hubs") return [];
  await useSessionStore.getState().loadSessions();
  return useSessionStore.getState().sessions.map((s) => ({
    ref: { kind: "session", id: s.id },
    label: s.title,
    hint: `Conversation · ${s.time}`,
  }));
}
