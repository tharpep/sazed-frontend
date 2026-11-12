import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { create } from "zustand";

import { useIsMobile } from "@/hooks/useIsMobile";
import { useChatStore } from "@/store/chatStore";
import { useNavStore } from "@/store/navStore";
import { Composer } from "./Composer";
import { ConversationList, useConversationList } from "./ConversationList";
import { NEW_CHAT_DRAFT } from "./draftStore";
import { MessageList } from "./MessageList";
import { openSession, useChatLoading, useOpenChatTitle } from "./openSession";

const TWO_PANES = "(min-width: 900px)";

function useTwoPanes() {
  const [wide, setWide] = useState(() => window.matchMedia(TWO_PANES).matches);
  useEffect(() => {
    const mql = window.matchMedia(TWO_PANES);
    const onChange = () => setWide(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return wide;
}

// The page remounts on every view switch, so the search lives outside it: Back from a
// conversation returns to the same filtered list.
const useListQuery = create<{ query: string; setQuery: (query: string) => void }>((set) => ({
  query: "",
  setQuery: (query) => set({ query }),
}));

/** The hub shell's Chat: the list, or the open conversation with its composer; both side by side
 * from 900px. */
export function ChatHub() {
  const view = useNavStore((s) => s.view.chat);
  const openId = useNavStore((s) => s.open.chat?.id ?? null);
  const go = useNavStore((s) => s.go);
  const { query, setQuery } = useListQuery();
  // Loads on every mount, the conversation view too, so the shell can name the open conversation.
  const data = useConversationList(true, query);
  const isMobile = useIsMobile();
  const wide = useTwoPanes();
  const title = useOpenChatTitle();
  const loading = useChatLoading();

  const list = (
    <ConversationList variant="hub" data={data} query={query} onQuery={setQuery} activeId={openId} onSelect={openSession} />
  );

  const conversation = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Phones go back from the header; between 640 and 900 the title row has no Back. */}
      {!isMobile && !wide && (
        <div className="flex h-11 flex-none items-center gap-1 border-b border-line pr-3 pl-1">
          <button
            type="button"
            onClick={() => go("chat", "list")}
            className="flex h-11 flex-none items-center gap-1 rounded-md px-2 text-meta text-ink-2 transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Chats
          </button>
          <span className="min-w-0 truncate text-meta text-ink">{title}</span>
        </div>
      )}
      {loading ? (
        <p role="status" className="grid flex-1 place-items-center p-6 text-meta text-muted">
          Loading conversation…
        </p>
      ) : (
        <MessageList />
      )}
      <ChatComposer loading={loading} draftKey={openId ?? NEW_CHAT_DRAFT} />
    </div>
  );

  if (!wide) return view === "conversation" ? conversation : <div className="flex min-h-0 flex-1 flex-col">{list}</div>;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[232px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col border-r border-line">{list}</div>
      {view === "conversation" ? (
        conversation
      ) : (
        <p className="grid place-items-center p-6 text-meta text-muted">Pick a conversation, or start a new one.</p>
      )}
    </div>
  );
}

// Until the named conversation's transcript lands, a send would go to the one still in the store.
function ChatComposer({ loading, draftKey }: { loading: boolean; draftKey: string }) {
  const send = useChatStore((s) => s.send);
  const stop = useChatStore((s) => s.stop);
  const isStreaming = useChatStore((s) => s.isStreaming);
  return (
    <Composer
      variant="docked"
      onSend={send}
      disabled={isStreaming || loading}
      isStreaming={isStreaming}
      onStop={stop}
      placeholder={loading ? "Loading conversation…" : undefined}
      draftKey={draftKey}
    />
  );
}
