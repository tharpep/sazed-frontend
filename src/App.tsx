import { useEffect } from "react";
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
      <div key={viewKey} className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
