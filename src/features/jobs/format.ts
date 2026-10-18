import type { JobEvent, JobKind, JobStatus } from "@/api/jobs";

export const KIND_LABEL: Record<JobKind, string> = {
  research: "Research",
  second_opinion: "Second opinion",
  code_task: "Code task",
};

export const STATUS_LABEL: Record<JobStatus, string> = {
  queued: "Queued",
  needs_approval: "Needs approval",
  running: "Running",
  succeeded: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
  timed_out: "Timed out",
};

/** Same color rule as the rest of the console: only problems (and approvals) get color. */
export function statusTone(status: JobStatus): string {
  if (status === "failed" || status === "timed_out") return "text-destructive";
  if (status === "needs_approval") return "text-accent";
  return "text-muted";
}

export function requesterLabel(requestedBy: string): string {
  if (requestedBy.startsWith("session:")) return "from chat";
  if (requestedBy === "console") return "from console";
  if (requestedBy === "mcp") return "from MCP";
  if (requestedBy.startsWith("automation")) return "from automation";
  return `from ${requestedBy}`;
}

/** "1m 45s" between two timestamps (or until now). */
export function duration(start: string | null, end: string | null): string {
  if (!start) return "";
  const secs = Math.max(0, Math.round(((end ? Date.parse(end) : Date.now()) - Date.parse(start)) / 1000));
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export interface Step {
  label: string;
  detail: string;
}

/** Paths relative to the job's checkout ("/home/worker/jobs/<id>/repo/app/x.py" -> "app/x.py"). */
function repoPath(p: string): string {
  const i = p.indexOf("/repo/");
  return i >= 0 ? p.slice(i + 6) : p;
}

const CLAUDE_TOOL_LABEL: Record<string, string> = {
  Read: "Read",
  Grep: "Searched",
  Glob: "Listed",
  Bash: "Ran",
  Edit: "Edited",
  Write: "Wrote",
  WebSearch: "Searched",
  WebFetch: "Read",
};

/** Readable steps from the agent's stream: what it searched, read, ran or changed. */
export function stepsFromEvents(events: JobEvent[] | undefined): Step[] {
  const steps: Step[] = [];
  for (const { event } of events ?? []) {
    // Claude Code: assistant messages carry tool_use blocks.
    if (event.type === "assistant") {
      const content = ((event.message as { content?: unknown[] } | undefined)?.content ?? []) as {
        type?: string;
        name?: string;
        input?: Record<string, unknown>;
      }[];
      for (const block of content) {
        if (block.type !== "tool_use") continue;
        const input = block.input ?? {};
        const str = (k: string) => (typeof input[k] === "string" ? (input[k] as string) : "");
        const detail =
          repoPath(str("file_path")) || str("pattern") || str("command") || str("query") || str("url");
        steps.push({ label: CLAUDE_TOOL_LABEL[block.name ?? ""] ?? block.name ?? "Tool", detail });
      }
      continue;
    }
    const step = event.step_update as
      | { step_type?: string; state?: string; tool_name?: string; tool_info?: { parameters?: Record<string, unknown> } }
      | undefined;
    if (!step || step.step_type !== "tool" || step.state !== "DONE") continue;
    const params = step.tool_info?.parameters ?? {};
    const pick = (...keys: string[]) => {
      for (const k of keys) if (typeof params[k] === "string") return params[k] as string;
      return "";
    };
    if (step.tool_name === "search_web") steps.push({ label: "Searched", detail: pick("query", "Query") });
    else if (step.tool_name === "read_url_content") steps.push({ label: "Read", detail: pick("Url", "url", "URL") });
    else steps.push({ label: step.tool_name ?? "Tool", detail: "" });
  }
  return steps;
}
