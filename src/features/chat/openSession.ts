import type { PaletteItem } from "@/nav/paletteSources";
import { useShellStore } from "@/nav/shellFlag";
import { useChatStore } from "@/store/chatStore";
import { useNavStore } from "@/store/navStore";
import { useSessionStore } from "@/store/sessionStore";

/** Writes the open conversation without navigating: navStore.openItem would also switch to Chat
 * and add the conversation to Recent. */
function setOpenSession(id: string | null) {
  if (useNavStore.getState().open.chat?.id === (id ?? undefined)) return;
  const open = { ...useNavStore.getState().open };
  if (id) open.chat = { kind: "session", id };
  else delete open.chat;
  useNavStore.setState({ open });
}

/** The conversation Chat shows, or is about to show once its load lands. */
function shownSession(): string | null {
  const chat = useChatStore.getState();
  return chat.loadingSessionId ?? chat.sessionId;
}

/** Opens a conversation in Chat, from anywhere. */
export function openSession(id: string) {
  useSessionStore.getState().selectSession(id);
  if (useShellStore.getState().shell === "old") void useChatStore.getState().loadSession(id);
}

/** Shows an empty conversation in Chat. */
export function startNewChat() {
  useChatStore.getState().newSession();
  useNavStore.getState().go("chat", "conversation");
}

/** In the hub shell, navStore.open.chat names the conversation Chat shows, and the chat store
 * holds it. Naming a new session in open.chat (a list row, the palette, Recent, Activity) loads
 * it; in every other disagreement open.chat follows the chat store: a new chat's first reply, a
 * new chat, a failed or superseded load, and a page or retap that cleared navStore's items.
 * Returns the unsubscribe. */
export function startSessionSync(): () => void {
  // open.chat can be left over from before a layout switch; loading it could abort a live stream.
  setOpenSession(shownSession());

  const offNav = useNavStore.subscribe((s, prev) => {
    const id = s.open.chat?.id;
    if (id === prev.open.chat?.id) return;
    if (!id) {
      setOpenSession(shownSession());
      return;
    }
    useSessionStore.setState({ activeSessionId: id });
    const chat = useChatStore.getState();
    if (id === chat.loadingSessionId) return;
    // Picking the conversation already on screen while another loads cancels that load.
    if (id === chat.sessionId) {
      if (chat.loadingSessionId) useChatStore.setState({ loadingSessionId: null });
      return;
    }
    void chat.loadSession(id);
  });
  const offChat = useChatStore.subscribe((s, prev) => {
    if (s.sessionId !== prev.sessionId || s.loadingSessionId !== prev.loadingSessionId) setOpenSession(shownSession());
  });
  return () => {
    offNav();
    offChat();
  };
}

/** True while Chat names a conversation whose transcript has not landed yet. */
export function useChatLoading(): boolean {
  return useChatStore((s) => s.loadingSessionId !== null);
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
