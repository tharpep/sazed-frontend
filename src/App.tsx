import { useEffect } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { AppShell } from "./components/layout/AppShell";
import { Composer } from "./features/chat/Composer";
import { SettingsPage } from "./features/settings/SettingsPage";
import { FinancePage } from "./features/finance/FinancePage";
import { AppsPage } from "./features/apps/AppsPage";
import { parseDeepLink } from "./nav/deepLinks";
import { viewDef } from "./nav/hubs";
import type { HubId } from "./nav/hubViews";
import { useUiStore } from "./store/uiStore";
import { useNavStore } from "./store/navStore";
import { useChatStore } from "./store/chatStore";
import { apiFetch } from "./api/client";

function App() {
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const financeOpen = useUiStore((s) => s.financeOpen);
  const appsOpen = useUiStore((s) => s.appsOpen);
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

  const [contentHub, contentView]: [HubId, string] =
    hub === "home" || hub === "chat" ? (messages.length === 0 ? ["home", "home"] : ["chat", "conversation"]) : [hub, view];
  const overlay = settingsOpen ? "settings" : financeOpen ? "finance" : appsOpen ? "apps" : null;
  const viewKey = overlay ?? `${contentHub}:${contentView}`;
  const onHomeOrChat = overlay === null && (contentHub === "home" || contentHub === "chat");
  const Page = viewDef(contentHub, contentView).component;

  useEffect(() => {
    const link = parseDeepLink(window.location.search);
    if (!link) return;
    const ui = useUiStore.getState();
    if (link.item) ui.linkItem(link.item);
    if (link.apps) ui.toggleApps();
    else ui.openView(link);
    window.history.replaceState(null, "", window.location.pathname);
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
      const ui = useUiStore.getState();
      if (useNavStore.getState().hub !== "home" || ui.settingsOpen || ui.financeOpen || ui.appsOpen) ui.closeAll();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <AppShell>
      {sessionLoadError && (
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
      )}
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
        ) : overlay === "apps" ? (
          <AppsPage />
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
