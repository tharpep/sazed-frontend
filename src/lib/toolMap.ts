import type { ToolCall } from "../mock/data";

const TOOL_NAME_TO_CATEGORY: Record<string, ToolCall["category"]> = {
  get_today: "calendar",
  get_events: "calendar",
  check_availability: "calendar",
  create_event: "calendar",
  update_event: "calendar",
  delete_event: "calendar",
  get_upcoming_tasks: "tasks",
  get_task_lists: "tasks",
  create_task: "tasks",
  update_task: "tasks",
  delete_task: "tasks",
  get_recent_emails: "email",
  get_unread_emails: "email",
  search_emails: "email",
  get_email: "email",
  draft_email: "email",
  send_notification: "notify",
  search_knowledge_base: "kb",
  memory_update: "memory",
};

const DEFAULT_CATEGORY: ToolCall["category"] = "tasks";

export function getCategory(toolName: string): ToolCall["category"] {
  return TOOL_NAME_TO_CATEGORY[toolName] ?? DEFAULT_CATEGORY;
}

export function toolUseToToolCall(block: {
  name: string;
  id?: string;
  input?: Record<string, unknown>;
}): ToolCall {
  const category = getCategory(block.name);
  const label = formatToolLabel(block.name, block.input);
  return { category, label, done: true };
}

/** Creates a pending (in-progress) ToolCall for use during streaming. */
export function toolCallPending(name: string): ToolCall {
  return {
    category: getCategory(name),
    label: name.replace(/_/g, " "),
    done: false,
  };
}

function formatToolLabel(name: string, input?: Record<string, unknown>): string {
  const normalized = name.replace(/_/g, " ");
  if (input && Object.keys(input).length > 0) {
    const parts = Object.entries(input)
      .slice(0, 2)
      .map(([k, v]) => (v !== undefined && v !== null ? `${k}: ${String(v)}` : ""));
    const extra = parts.filter(Boolean).join(", ");
    return extra ? `${normalized} · ${extra}` : normalized;
  }
  return normalized;
}
