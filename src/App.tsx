import { useEffect } from "react";
import { TopBar } from "./components/TopBar/TopBar";
import { InputBar } from "./components/InputBar/InputBar";
import { EmptyState } from "./features/chat/EmptyState";
import { ChatArea } from "./features/chat/ChatArea";
import { HistoryOverlay } from "./features/history/HistoryOverlay";
import { useUiStore } from "./store/uiStore";
import { useChatStore } from "./store/chatStore";
import { apiFetch } from "./api/client";
import styles from "./App.module.css";

function App() {
  const historyOpen = useUiStore((s) => s.historyOpen);
  const toggleHistory = useUiStore((s) => s.toggleHistory);
  const setOnline = useUiStore((s) => s.setOnline);
  const online = useUiStore((s) => s.online);
  const messages = useChatStore((s) => s.messages);
  const send = useChatStore((s) => s.send);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const view = messages.length === 0 ? "empty" : "chat";

  useEffect(() => {
    const check = () =>
      (apiFetch("/health") as Promise<unknown>)
        .then(() => setOnline(true))
        .catch(() => setOnline(false));
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [setOnline]);

  return (
    <div className={styles.surface}>
      <div className={styles.dragBar} />
      <div className={styles.floatingUnit}>
        <HistoryOverlay open={historyOpen} />
        <div className={styles.mainPanel}>
          <TopBar
            historyOpen={historyOpen}
            onToggleHistory={toggleHistory}
            online={online}
          />
          {view === "empty" ? <EmptyState /> : <ChatArea />}
          <InputBar onSend={send} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
}

export default App;
