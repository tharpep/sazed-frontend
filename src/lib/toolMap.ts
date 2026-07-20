import type { ToolCall } from "../mock/data";

const TOOL_NAME_TO_CATEGORY: Record<string, ToolCall["category"]> = {
  get_events: "calendar",
  check_availability: "calendar",
  create_event: "calendar",
  update_event: "calendar",
  delete_event: "calendar",
  search_events: "calendar",
  get_task_lists: "tasks",
  get_tasks: "tasks",
  create_task_list: "tasks",
  rename_task_list: "tasks",
  create_task: "tasks",
  update_task: "tasks",
  delete_task: "tasks",
  list_emails: "email",
  search_emails: "email",
  get_email: "email",
  draft_email: "email",
  send_email: "email",
  reply_to_email: "email",
  send_notification: "notify",
  search_knowledge_base: "kb",
  get_kb_index: "kb",
  read_kb_source: "kb",
  list_kb_sources: "kb",
  delete_kb_source: "kb",
  sync_kb: "kb",
  ingest_text: "kb",
  ingest_url: "kb",
  memory_update: "memory",
  get_subscriptions: "finance",
  add_subscription: "finance",
  update_subscription: "finance",
  delete_subscription: "finance",
  get_budget: "finance",
  set_budget_limit: "finance",
  delete_budget: "finance",
  get_income: "finance",
  add_income_source: "finance",
  delete_income: "finance",
  get_upcoming_bills: "finance",
  get_monthly_summary: "finance",
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
  return { name: block.name, category, label, done: true, status: "success" };
}

/** Creates a pending (in-progress) ToolCall for use during streaming. */
export function toolCallPending(name: string): ToolCall {
  return {
    name,
    category: getCategory(name),
    label: name.replace(/_/g, " "),
    done: false,
    status: "pending",
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
