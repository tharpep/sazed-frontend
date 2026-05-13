import { useEffect } from "react";
import { TopBar } from "./components/TopBar/TopBar";
import { InputBar } from "./components/InputBar/InputBar";
import { DashboardEmpty } from "./features/chat/DashboardEmpty";
import { ChatArea } from "./features/chat/ChatArea";
import { HistoryOverlay } from "./features/history/HistoryOverlay";
import { KbPage } from "./features/kb/KbPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { AuditPage } from "./features/audit/AuditPage";
import { FinancePage } from "./features/finance/FinancePage";
import { JournalPage } from "./features/journal/JournalPage";
import { useUiStore } from "./store/uiStore";
import { useChatStore } from "./store/chatStore";
import { apiFetch } from "./api/client";
import styles from "./App.module.css";

function App() {
  const historyOpen = useUiStore((s) => s.historyOpen);
  const kbOpen = useUiStore((s) => s.kbOpen);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const auditOpen = useUiStore((s) => s.auditOpen);
  const financeOpen = useUiStore((s) => s.financeOpen);
  const journalOpen = useUiStore((s) => s.journalOpen);
  const toggleHistory = useUiStore((s) => s.toggleHistory);
  const toggleKb = useUiStore((s) => s.toggleKb);
  const toggleSettings = useUiStore((s) => s.toggleSettings);
  const toggleAudit = useUiStore((s) => s.toggleAudit);
  const toggleFinance = useUiStore((s) => s.toggleFinance);
  const toggleJournal = useUiStore((s) => s.toggleJournal);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const setOnline = useUiStore((s) => s.setOnline);
  const online = useUiStore((s) => s.online);
  const messages = useChatStore((s) => s.messages);
  const send = useChatStore((s) => s.send);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const view = messages.length === 0 ? "empty" : "chat";
  const viewKey = settingsOpen ? "settings" : auditOpen ? "audit" : financeOpen ? "finance" : journalOpen ? "journal" : kbOpen ? "kb" : view;

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
  }, [historyOpen, kbOpen, settingsOpen, auditOpen, financeOpen, journalOpen,
      setHistoryOpen, toggleKb, setSettingsOpen, toggleAudit, toggleFinance, toggleJournal]);

  return (
    <div className={styles.surface}>
      <div className={styles.dragBar} />
      <div className={styles.floatingUnit}>
        <HistoryOverlay open={historyOpen} />
        <div className={styles.mainPanel}>
          <TopBar
            historyOpen={historyOpen}
            kbOpen={kbOpen}
            settingsOpen={settingsOpen}
            auditOpen={auditOpen}
            financeOpen={financeOpen}
            journalOpen={journalOpen}
            onToggleHistory={toggleHistory}
            onToggleKb={toggleKb}
            onToggleSettings={toggleSettings}
            onToggleAudit={toggleAudit}
            onToggleFinance={toggleFinance}
            onToggleJournal={toggleJournal}
            online={online}
          />
          <div key={viewKey} className={styles.viewContainer}>
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
              <DashboardEmpty />
            ) : (
              <ChatArea />
            )}
          </div>
          {!kbOpen && !settingsOpen && !auditOpen && !financeOpen && !journalOpen && (
            <InputBar
              onSend={send}
              disabled={isStreaming}
              historyOpen={historyOpen}
              onToggleHistory={toggleHistory}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
