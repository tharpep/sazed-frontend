import { useEffect } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { AppShell } from "./components/layout/AppShell";
import { Composer } from "./features/chat/Composer";
import { EmptyState } from "./features/chat/EmptyState";
import { MessageList } from "./features/chat/MessageList";
import { KbPage } from "./features/kb/KbPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { AuditPage } from "./features/audit/AuditPage";
import { FinancePage } from "./features/finance/FinancePage";
import { JournalPage } from "./features/journal/JournalPage";
import { useUiStore } from "./store/uiStore";
import { useChatStore } from "./store/chatStore";
import { apiFetch } from "./api/client";

function App() {
  const kbOpen = useUiStore((s) => s.kbOpen);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const auditOpen = useUiStore((s) => s.auditOpen);
  const financeOpen = useUiStore((s) => s.financeOpen);
  const journalOpen = useUiStore((s) => s.journalOpen);
  const historyOpen = useUiStore((s) => s.historyOpen);
  const toggleKb = useUiStore((s) => s.toggleKb);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const toggleAudit = useUiStore((s) => s.toggleAudit);
  const toggleFinance = useUiStore((s) => s.toggleFinance);
  const toggleJournal = useUiStore((s) => s.toggleJournal);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);
  const setOnline = useUiStore((s) => s.setOnline);
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
          : kbOpen
            ? "kb"
            : view;

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
    setHistoryOpen,
    toggleKb,
    setSettingsOpen,
    toggleAudit,
    toggleFinance,
    toggleJournal,
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
          <AuditPage />
        ) : financeOpen ? (
          <FinancePage />
        ) : journalOpen ? (
          <JournalPage />
        ) : kbOpen ? (
          <KbPage />
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
