import { useEffect } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { AppShell } from "./components/layout/AppShell";
import { HubContent } from "./components/shell/HubContent";
import { ChatHub } from "./features/chat/ChatHub";
import { Composer } from "./features/chat/Composer";
import { askFromHome } from "./features/home/homeNav";
import { useIsMobile } from "./hooks/useIsMobile";
import { SettingsPage } from "./features/settings/SettingsPage";
import { FinancePage } from "./features/finance/FinancePage";
import { parseDeepLink } from "./nav/deepLinks";
import { viewDef } from "./nav/hubs";
import { useShellStore } from "./nav/shellFlag";
import type { HubId } from "./nav/hubViews";
import { useUiStore } from "./store/uiStore";
import { useNavStore } from "./store/navStore";
import { useChatStore } from "./store/chatStore";
import { apiFetch } from "./api/client";

function App() {
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const financeOpen = useUiStore((s) => s.financeOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const setOnline = useUiStore((s) => s.setOnline);
  const hidePrivate = useUiStore((s) => s.hidePrivate);
  const hub = useNavStore((s) => s.hub);
  const view = useNavStore((s) => s.view[s.hub]);
  const messages = useChatStore((s) => s.messages);
  const send = useChatStore((s) => s.send);
  const stop = useChatStore((s) => s.stop);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const newSession = useChatStore((s) => s.newSession);
  const sessionLoadError = useChatStore((s) => s.sessionLoadError);
  const dismissSessionLoadError = useChatStore((s) => s.dismissSessionLoadError);
  const shell = useShellStore((s) => s.shell);
  const retaps = useNavStore((s) => s.retaps);
  const isMobile = useIsMobile();

  const [contentHub, contentView]: [HubId, string] =
    hub === "home" || hub === "chat" ? (messages.length === 0 ? ["home", "home"] : ["chat", "conversation"]) : [hub, view];
  const overlay = settingsOpen ? "settings" : financeOpen ? "finance" : null;
  const viewKey = overlay ?? `${contentHub}:${contentView}`;
  const onHomeOrChat = overlay === null && (contentHub === "home" || contentHub === "chat");
  const Page = viewDef(contentHub, contentView).component;

  useEffect(() => {
    const link = parseDeepLink(window.location.search);
    // shellFlag has already read ?shell=; it only needs dropping from the address bar.
    const shellParam = new URLSearchParams(window.location.search).has("shell");
    if (link) {
      const ui = useUiStore.getState();
      link.items?.forEach(ui.linkItem);
      ui.openView(link);
    }
    if (link || shellParam) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  // Private apps never stay revealed once the console leaves the screen.
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
      if (e.key !== "Escape" || useShellStore.getState().shell === "hubs") return;
      const ui = useUiStore.getState();
      if (useNavStore.getState().hub !== "home" || ui.settingsOpen || ui.financeOpen) ui.closeAll();
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

  if (shell === "hubs") {
    // The registry's chat views are the old shell's MessageList; the hub shell's Chat is one page
    // that shows the list, the conversation or both.
    const HubPage = hub === "chat" ? ChatHub : viewDef(hub, view).component;
    // On desktop Home's ask field sits in the page's left column instead.
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
        {/* MessageList follows the stream to the bottom itself; a restored older scrollTop would
            leave the reply streaming off-screen. */}
        <HubContent key={`${hub}:${view}:${retaps}`} scrollKey={hub === "chat" ? null : `${hub}:${view}`}>
          <HubPage />
        </HubContent>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {banner}
      <div key={viewKey} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {viewKey === "chat:conversation" && (
          <div className="flex items-center justify-end border-b border-border px-3 py-2 sm:hidden">
            <button
              type="button"
              onClick={newSession}
              aria-label="New chat"
              title="New chat"
              className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <MessageSquarePlus className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
        {overlay === "settings" ? (
          <SettingsPage onClose={() => setSettingsOpen(false)} />
        ) : overlay === "finance" ? (
          <FinancePage />
        ) : (
          <Page />
        )}
      </div>
      {onHomeOrChat && (
        <Composer
          variant="docked"
          onSend={send}
          disabled={isStreaming}
          isStreaming={isStreaming}
          onStop={stop}
        />
      )}
    </AppShell>
  );
}

export default App;
