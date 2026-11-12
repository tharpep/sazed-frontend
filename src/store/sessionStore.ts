import { create } from "zustand";
import type { Session } from "../mock/data";
import { listConversations } from "../api/conversations";
import { useShellStore } from "../nav/shellFlag";
import { useNavStore } from "./navStore";
import { useUiStore } from "./uiStore";

function daysAgo(d: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((today.getTime() - dayStart.getTime()) / 86400000);
}

function clock(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diffDays = daysAgo(d);
  const timeStr = clock(d);

  if (diffDays === 0) return timeStr;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  if (diffDays >= 2 && diffDays <= 7) return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${timeStr}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

// The hub list's one-line rows sit under a day heading, so the time only needs what the heading
// leaves out.
function shortTime(iso: string): string {
  const d = new Date(iso);
  const diffDays = daysAgo(d);
  if (diffDays <= 1) return clock(d);
  if (diffDays <= 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dateGroup(iso: string): string {
  const diffDays = daysAgo(new Date(iso));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays >= 2 && diffDays <= 7) return "This Week";
  return "Older";
}

export interface ChatSession extends Session {
  shortTime: string;
}

interface SessionState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  sessionsError: string | null;
  loadSessions: () => Promise<void>;
  selectSession: (id: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,
  sessionsError: null,
  loadSessions: async () => {
    try {
      const res = await listConversations();
      const sessions: ChatSession[] = res.conversations.map((c) => ({
        id: c.session_id,
        title: c.title ?? `${c.session_id.slice(0, 8)}…`,
        time: formatTime(c.last_activity),
        shortTime: shortTime(c.last_activity),
        dateGroup: dateGroup(c.last_activity),
      }));
      set({ sessions, sessionsError: null });
    } catch (err) {
      set({ sessionsError: err instanceof Error ? err.message : "Failed to load conversations" });
    }
  },
  selectSession: (id: string) => {
    set({ activeSessionId: id });
    // The old shell shows a loaded session on Home; the hub shell shows it only in Chat, and loads
    // it from navStore.open.chat (startSessionSync), so its callers must not load it as well.
    if (useShellStore.getState().shell === "hubs") useNavStore.getState().openItem({ kind: "session", id });
    else useUiStore.getState().setHistoryOpen(false);
  },
}));
