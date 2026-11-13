import { useEffect } from "react";
import { X } from "lucide-react";

import { AppShell } from "./components/layout/AppShell";
import { HubContent } from "./components/shell/HubContent";
import { ChatHub } from "./features/chat/ChatHub";
import { Composer } from "./features/chat/Composer";
import { askFromHome } from "./features/home/homeNav";
import { useIsMobile } from "./hooks/useIsMobile";
import { parseDeepLink } from "./nav/deepLinks";
import { viewDef } from "./nav/hubs";
import { useUiStore } from "./store/uiStore";
import { useNavStore } from "./store/navStore";
import { useChatStore } from "./store/chatStore";
import { apiFetch } from "./api/client";

function App() {
  const setOnline = useUiStore((s) => s.setOnline);
  const hidePrivate = useUiStore((s) => s.hidePrivate);
  const hub = useNavStore((s) => s.hub);
  const view = useNavStore((s) => s.view[s.hub]);
  const messages = useChatStore((s) => s.messages);
  const send = useChatStore((s) => s.send);
  const stop = useChatStore((s) => s.stop);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const sessionLoadError = useChatStore((s) => s.sessionLoadError);
  const dismissSessionLoadError = useChatStore((s) => s.dismissSessionLoadError);
  const retaps = useNavStore((s) => s.retaps);
  const isMobile = useIsMobile();

  const contentHub = hub === "home" || hub === "chat" ? (messages.length === 0 ? "home" : "chat") : hub;
  const contentView = hub === "home" || hub === "chat" ? (messages.length === 0 ? "home" : "conversation") : view;
  const Page = viewDef(contentHub, contentView).component;

  useEffect(() => {
    const link = parseDeepLink(window.location.search);
    const shellParam = new URLSearchParams(window.location.search).has("shell");
    if (link) {
      link.items?.forEach((item) => useNavStore.getState().openItem(item));
      useNavStore.getState().go(link.hub, link.view);
    }
    if (link || shellParam) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) hidePrivate();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [hidePrivate]);

  useEffect(() => {
    const check = () =>
      (apiFetch("/health") as Promise<unknown>)
        .then(() => setOnline(true))
        .catch(() => setOnline(false));
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [setOnline]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const nav = useNavStore.getState();
      if (nav.hub !== "home") nav.go("home");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const banner = sessionLoadError && (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <span>{sessionLoadError}</span>
      <button
        type="button"
        onClick={dismissSessionLoadError}
        aria-label="Dismiss"
        className="flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-destructive/10"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );

  const HubPage = hub === "chat" ? ChatHub : Page;
  const docked = ((hub === "home" && isMobile) || hub === "chat") && (
    <Composer
      variant="docked"
      onSend={hub === "home" ? askFromHome : send}
      placeholder={hub === "home" ? "Ask Sazed, or describe a task" : undefined}
      disabled={isStreaming}
      isStreaming={isStreaming}
      onStop={stop}
    />
  );

  return (
    <AppShell docked={docked}>
      {banner}
      <HubContent key={`${hub}:${view}:${retaps}`} scrollKey={hub === "chat" ? null : `${hub}:${view}`}>
        <HubPage />
      </HubContent>
    </AppShell>
  );
}

export default App;
