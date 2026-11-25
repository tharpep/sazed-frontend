import { useEffect } from "react";
import { X } from "lucide-react";

import { AppShell } from "./components/layout/AppShell";
import { HubContent } from "./components/shell/HubContent";
import { ChatHub } from "./features/chat/ChatHub";
import { Composer } from "./features/chat/Composer";
import { askFromHome } from "./features/home/homeNav";
import { useIsMobile } from "./hooks/useIsMobile";
import { parseDeepLink, parseOpenLink } from "./nav/deepLinks";
import { followOpenLink } from "./nav/openLink";
import { viewDef } from "./nav/hubs";
import { useUiStore } from "./store/uiStore";
import { useNavStore } from "./store/navStore";
import { useChatStore } from "./store/chatStore";

function App() {
  const hidePrivate = useUiStore((s) => s.hidePrivate);
  const hub = useNavStore((s) => s.hub);
  const view = useNavStore((s) => s.view[s.hub]);
  const send = useChatStore((s) => s.send);
  const stop = useChatStore((s) => s.stop);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const sessionLoadError = useChatStore((s) => s.sessionLoadError);
  const dismissSessionLoadError = useChatStore((s) => s.dismissSessionLoadError);
  const retaps = useNavStore((s) => s.retaps);
  const isMobile = useIsMobile();

  useEffect(() => {
    const link = parseDeepLink(window.location.search);
    const open = parseOpenLink(window.location.search);
    if (link || new URLSearchParams(window.location.search).has("open")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (link) {
      link.items?.forEach((item) => useNavStore.getState().openItem(item));
      useNavStore.getState().go(link.hub, link.view);
      if (link.sub) useNavStore.getState().setSub(link.sub.key, link.sub.value as never);
    } else if (open) {
      useNavStore.getState().go("home");
      void followOpenLink(open);
    }
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) hidePrivate();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [hidePrivate]);

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

  const HubPage = hub === "chat" ? ChatHub : viewDef(hub, view).component;
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
