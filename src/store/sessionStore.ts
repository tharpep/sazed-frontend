import { create } from "zustand";
import type { Session } from "../mock/data";
import { listConversations } from "../api/conversations";
import { useUiStore } from "./uiStore";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - dayStart.getTime()) / 86400000);

  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (diffDays === 0) return timeStr;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  if (diffDays >= 2 && diffDays <= 7) return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${timeStr}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function dateGroup(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - dayStart.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays >= 2 && diffDays <= 7) return "This Week";
  return "Older";
}

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  loadSessions: () => Promise<void>;
  selectSession: (id: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,
  loadSessions: async () => {
    try {
      const res = await listConversations();
      const sessions: Session[] = res.conversations.map((c) => ({
        id: c.session_id,
        title: `${c.session_id.slice(0, 8)}…`,
        time: formatTime(c.last_activity),
        dateGroup: dateGroup(c.last_activity),
      }));
      set({ sessions });
    } catch {
      // Sazed offline — leave sessions list unchanged
    }
  },
  selectSession: (id: string) => {
    set({ activeSessionId: id });
    useUiStore.getState().setHistoryOpen(false);
  },
}));
