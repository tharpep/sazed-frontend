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
