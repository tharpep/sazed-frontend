import { useState } from "react";
import { TopBar } from "./components/TopBar/TopBar";
import { InputBar } from "./components/InputBar/InputBar";
import { EmptyState } from "./features/chat/EmptyState";
import { ChatArea } from "./features/chat/ChatArea";
import { HistoryOverlay } from "./features/history/HistoryOverlay";
import styles from "./App.module.css";

function App() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [view] = useState<"empty" | "chat">("chat");

  return (
    <div className={styles.surface}>
      <div className={styles.floatingUnit}>
        <HistoryOverlay open={historyOpen} />
        <div className={styles.mainPanel}>
          <TopBar
            historyOpen={historyOpen}
            onToggleHistory={() => setHistoryOpen((o) => !o)}
          />
          {view === "empty" ? <EmptyState /> : <ChatArea />}
          <InputBar />
        </div>
      </div>
    </div>
  );
}

export default App;
