export interface ToolCall {
  category: "calendar" | "email" | "tasks" | "kb" | "notify" | "memory";
  label: string;
  done: boolean;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  tools?: ToolCall[];
  events?: { time: string; name: string; meta?: string }[];
}

export interface Session {
  id: string;
  title: string;
  time: string;
  dateGroup: string;
}

export const MOCK_EVENTS = [
  { time: "10:00", name: "Senior Design standup", meta: "· 30m, Zoom" },
  { time: "1:00", name: "Office hours — Dr. Chen", meta: "" },
  { time: "5:30", name: "Gym", meta: "" },
];

export const MOCK_MESSAGES: Message[] = [
  {
    role: "user",
    content:
      "What's happening today? And remind me about the Voyage AI rate limits — did we decide on a strategy?",
  },
  {
    role: "assistant",
    content:
      "On Voyage AI — from your Feb 14 notes, you decided on exponential backoff with a local request queue. Free tier gives 200M tokens and you estimated 2-5M/month, so rate limits aren't a practical concern. You wrote \"don't over-engineer this\" as a note to yourself.",
    tools: [
      { category: "calendar", label: "Calendar · 3 events", done: true },
      { category: "kb", label: "KB · \"voyage rate limits\"", done: true },
    ],
    events: MOCK_EVENTS,
  },
  {
    role: "user",
    content:
      "Ha, sounds like me. Create a task to implement the backoff logic this week.",
  },
  {
    role: "assistant",
    content: "Done. \"Implement Voyage AI rate limit backoff\" added to your list, due Friday.",
    tools: [{ category: "tasks", label: "Task created · due Fri", done: true }],
  },
];

export const MOCK_SESSIONS: Session[] = [
  { id: "1", title: "Calendar & Voyage AI rate limits", time: "8:42 AM", dateGroup: "Today" },
  { id: "2", title: "KB sync endpoint debugging", time: "3:15 PM", dateGroup: "Yesterday" },
  { id: "3", title: "Senior design progress report", time: "10:20 AM", dateGroup: "Yesterday" },
  { id: "4", title: "Neon connection pool config", time: "Feb 15, 7:30 PM", dateGroup: "This Week" },
  { id: "5", title: "Voyage AI embedding tests", time: "Feb 14, 2:00 PM", dateGroup: "This Week" },
  { id: "6", title: "Session processing design", time: "Feb 13, 11:45 AM", dateGroup: "This Week" },
  { id: "7", title: "Gateway auth refactor notes", time: "Feb 12, 4:10 PM", dateGroup: "This Week" },
];
