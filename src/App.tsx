import { useEffect } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { AppShell } from "./components/layout/AppShell";
import { Composer } from "./features/chat/Composer";
import { EmptyState } from "./features/chat/EmptyState";
import { MessageList } from "./features/chat/MessageList";
import { KnowledgePage } from "./features/kb/KnowledgePage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { ActivityPage } from "./features/activity/ActivityPage";
import { FinancePage } from "./features/finance/FinancePage";
import { JournalPage } from "./features/journal/JournalPage";
import { HomelabPage } from "./features/homelab/HomelabPage";
import { AppsPage } from "./features/apps/AppsPage";
import { GatewayPage } from "./features/gateway/GatewayPage";
import { AutomationsPage } from "./features/automations/AutomationsPage";
import { BacklogPage } from "./features/backlog/BacklogPage";
import { useUiStore } from "./store/uiStore";
import { useChatStore } from "./store/chatStore";
import { apiFetch } from "./api/client";

function App() {
  const kbOpen = useUiStore((s) => s.kbOpen);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const auditOpen = useUiStore((s) => s.auditOpen);
  const financeOpen = useUiStore((s) => s.financeOpen);
  const journalOpen = useUiStore((s) => s.journalOpen);
  const homelabOpen = useUiStore((s) => s.homelabOpen);
  const appsOpen = useUiStore((s) => s.appsOpen);
  const gatewayOpen = useUiStore((s) => s.gatewayOpen);
  const automationsOpen = useUiStore((s) => s.automationsOpen);
  const backlogOpen = useUiStore((s) => s.backlogOpen);
  const historyOpen = useUiStore((s) => s.historyOpen);
  const toggleKb = useUiStore((s) => s.toggleKb);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const toggleAudit = useUiStore((s) => s.toggleAudit);
  const toggleFinance = useUiStore((s) => s.toggleFinance);
  const toggleJournal = useUiStore((s) => s.toggleJournal);
  const toggleHomelab = useUiStore((s) => s.toggleHomelab);
  const toggleApps = useUiStore((s) => s.toggleApps);
  const toggleGateway = useUiStore((s) => s.toggleGateway);
  const toggleAutomations = useUiStore((s) => s.toggleAutomations);
  const toggleBacklog = useUiStore((s) => s.toggleBacklog);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);
  const setOnline = useUiStore((s) => s.setOnline);
  const setLinkedBacklogItem = useUiStore((s) => s.setLinkedBacklogItem);
  const messages = useChatStore((s) => s.messages);
  const send = useChatStore((s) => s.send);
  const stop = useChatStore((s) => s.stop);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const newSession = useChatStore((s) => s.newSession);
  const sessionLoadError = useChatStore((s) => s.sessionLoadError);
  const dismissSessionLoadError = useChatStore((s) => s.dismissSessionLoadError);
  const view = messages.length === 0 ? "empty" : "chat";
  const viewKey = settingsOpen
    ? "settings"
    : auditOpen
      ? "audit"
      : financeOpen
        ? "finance"
        : journalOpen
          ? "journal"
          : homelabOpen
            ? "homelab"
            : appsOpen
            ? "apps"
            : gatewayOpen
            ? "gateway"
            : automationsOpen
            ? "automations"
            : backlogOpen
            ? "backlog"
            : kbOpen
              ? "kb"
              : view;

  // Links from Pushover open a page directly: /?page=backlog&item=<id>. Views are uiStore flags,
  // not routes, so read the query once and then drop it from the address bar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    if (!page) return;
    const ui = useUiStore.getState();
    const open: Record<string, () => void> = {
      backlog: ui.toggleBacklog,
      automations: ui.toggleAutomations,
      homelab: ui.toggleHomelab,
      apps: ui.toggleApps,
      kb: ui.toggleKb,
      journal: ui.toggleJournal,
    };
    open[page]?.();
    if (page === "backlog") setLinkedBacklogItem(params.get("item"));
    window.history.replaceState(null, "", window.location.pathname);
  }, [setLinkedBacklogItem]);

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
      if (e.key === "Escape") {
        if (historyOpen) setHistoryOpen(false);
        else if (kbOpen) toggleKb();
        else if (settingsOpen) setSettingsOpen(false);
        else if (auditOpen) toggleAudit();
        else if (financeOpen) toggleFinance();
        else if (journalOpen) toggleJournal();
        else if (homelabOpen) toggleHomelab();
        else if (appsOpen) toggleApps();
        else if (gatewayOpen) toggleGateway();
        else if (automationsOpen) toggleAutomations();
        else if (backlogOpen) toggleBacklog();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    historyOpen,
    kbOpen,
    settingsOpen,
    auditOpen,
    financeOpen,
    journalOpen,
    homelabOpen,
    appsOpen,
    gatewayOpen,
    automationsOpen,
    backlogOpen,
    setHistoryOpen,
    toggleKb,
    setSettingsOpen,
    toggleAudit,
    toggleFinance,
    toggleJournal,
    toggleHomelab,
    toggleApps,
    toggleGateway,
    toggleAutomations,
    toggleBacklog,
  ]);

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
        {viewKey === "chat" && messages.length > 0 && (
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
        {settingsOpen ? (
          <SettingsPage onClose={() => setSettingsOpen(false)} />
        ) : auditOpen ? (
          // auditOpen is the Activity page now (it replaced the Tool log)
          <ActivityPage />
        ) : financeOpen ? (
          <FinancePage />
        ) : journalOpen ? (
          <JournalPage />
        ) : homelabOpen ? (
          <HomelabPage />
        ) : appsOpen ? (
          <AppsPage />
        ) : gatewayOpen ? (
          <GatewayPage />
        ) : automationsOpen ? (
          <AutomationsPage />
        ) : backlogOpen ? (
          <BacklogPage />
        ) : kbOpen ? (
          <KnowledgePage />
        ) : view === "empty" ? (
          <EmptyState />
        ) : (
          <MessageList />
        )}
      </div>
      {viewKey === "chat" && (
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
