import type { NavTarget } from "@/nav/hubViews";
import { useChatStore } from "@/store/chatStore";
import { useNavStore } from "@/store/navStore";

export function goTo(target: NavTarget) {
  useNavStore.getState().go(target.hub, target.view);
}

export function openSystem(view: "homelab" | "activity") {
  if (view === "homelab") useNavStore.getState().setSub("system:homelab", "list");
  useNavStore.getState().go("system", view);
}

export function openProject(slug: string) {
  useNavStore.getState().openItem({ kind: "project", id: slug });
}

export function openBacklogItem(id: string) {
  useNavStore.getState().openItem({ kind: "backlog", id });
}

export function openDispatch(plan: string) {
  useNavStore.getState().openItem({ kind: "dispatch", id: plan });
}

// Home's ask field always starts a new chat and answers in Chat: a question typed on Home must
// never land in a session opened elsewhere (an automation run's, say), nor stream off-screen.
export function askFromHome(text: string) {
  const chat = useChatStore.getState();
  chat.newSession();
  useNavStore.getState().go("chat", "conversation");
  return chat.send(text);
}
