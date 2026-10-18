import type { BacklogItem, BacklogStatus, BacklogType } from "@/api/backlog";

/** Suggestions for an approved item's PR target (mirrors SCOUT_REPOS in sazed's config). */
export const REPOS = [
  "tharpep/sazed",
  "tharpep/api-gateway",
  "tharpep/knowledge-base",
  "tharpep/sazed-frontend",
  "tharpep/sazed-worker",
  "tharpep/sazed-mcp",
];

export const TYPE_LABEL: Record<BacklogType, string> = {
  idea: "Idea",
  bug: "Bug",
  gap: "Gap",
  optimization: "Optimization",
  planned: "Planned",
  known_issue: "Known issue",
};

export const STATUS_LABEL: Record<BacklogStatus, string> = {
  new: "New",
  shortlisted: "Shortlisted",
  approved: "Approved",
  done: "Done",
  dismissed: "Dismissed",
  stale: "Stale",
};

/** Where the approved work stands, from its job: building, PR open, or failed. */
export function workLabel(item: BacklogItem): string | null {
  if (!item.job_id) return null;
  if (item.job_meta?.pr_url) return `PR #${item.job_meta.pr_number}`;
  if (item.job_status === "failed" || item.job_status === "timed_out") return "Job failed";
  if (item.job_status === "succeeded") return "No PR";
  return "Building";
}

export function sourceLabel(source: string): string {
  if (source === "scout") return "from the scout";
  if (source === "chat") return "from chat";
  if (source === "console") return "added by you";
  return `from ${source}`;
}

export function ageLabel(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
