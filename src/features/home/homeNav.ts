import { rememberHomelabView } from "@/features/homelab/HomelabPage";
import type { NavTarget } from "@/nav/hubViews";
import { useShellStore } from "@/nav/shellFlag";
import { useChatStore } from "@/store/chatStore";
import { useNavStore } from "@/store/navStore";
import { useUiStore } from "@/store/uiStore";

// The hub shell resyncs uiStore's page booleans on every navStore change, so a toggleX() after a
// move there would read the page as open and close it again. Only the old shell needs the toggles.
const hubShell = () => useShellStore.getState().shell === "hubs";

export function goTo(target: NavTarget) {
  if (hubShell()) useNavStore.getState().go(target.hub, target.view);
  else useUiStore.getState().openView(target);
}

export function openSystem(view: "homelab" | "activity") {
  if (hubShell()) return useNavStore.getState().go("system", view);
  const ui = useUiStore.getState();
  if (view === "activity") return ui.toggleAudit();
  rememberHomelabView("list");
  ui.toggleHomelab();
}

// Pages still read their item from uiStore's linkedX until their hub slice moves the reads to
// navStore; each setter also calls navStore.openItem().
export function openProject(slug: string) {
  const ui = useUiStore.getState();
  ui.setLinkedProject(slug);
  if (!hubShell()) ui.toggleProjects();
}

export function openBacklogItem(id: string) {
  const ui = useUiStore.getState();
  ui.setLinkedBacklogItem(id);
  if (!hubShell()) ui.toggleBacklog();
}

export function openDispatch(plan: string) {
  const ui = useUiStore.getState();
  ui.setLinkedDispatchPlan(plan);
  if (!hubShell()) ui.togglePlans();
}

// Home's ask field always starts a new chat and answers in Chat: a question typed on Home must
// never land in a session opened elsewhere (an automation run's, say), nor stream off-screen.
export function askFromHome(text: string) {
  const chat = useChatStore.getState();
  chat.newSession();
  useNavStore.getState().go("chat", "conversation");
  return chat.send(text);
}
