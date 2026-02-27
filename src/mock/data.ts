export type TextBlock = { type: "text"; content: string };
export type ToolBlock = {
  type: "tool";
  name: string;
  category: "calendar" | "email" | "tasks" | "kb" | "notify" | "memory" | "finance";
  label: string;
  done: boolean;
  status: "pending" | "success" | "error";
  error?: string;
};
export type MessageBlock = TextBlock | ToolBlock;

export interface ToolCall {
  name: string;
  category: "calendar" | "email" | "tasks" | "kb" | "notify" | "memory" | "finance";
  label: string;
  done: boolean;
  status: "pending" | "success" | "error";
  error?: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  blocks?: MessageBlock[];
  events?: { time: string; name: string; meta?: string }[];
  isError?: boolean;
}

export interface Session {
  id: string;
  title: string;
  time: string;
  dateGroup: string;
}
