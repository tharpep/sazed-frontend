import type { ComponentType } from "react";
import {
  Bell,
  Bot,
  BrainCircuit,
  CalendarClock,
  Hammer,
  Lightbulb,
  MessageCircle,
  Plug,
  Server,
  ShieldQuestion,
  Wrench,
} from "lucide-react";

import type { ActivityCategory, ActivityEvent, ActivityStatus } from "@/api/activity";

export const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  chat: "Chat",
  llm: "Models",
  tool: "Tools",
  approval: "Approvals",
  automation: "Automations",
  job: "Jobs",
  backlog: "Backlog",
  homelab: "Homelab",
  notify: "Pushover",
  mcp: "MCP",
};

export const CATEGORY_ICON: Record<ActivityCategory, ComponentType<{ className?: string }>> = {
  chat: MessageCircle,
  llm: BrainCircuit,
  tool: Wrench,
  approval: ShieldQuestion,
  automation: CalendarClock,
  job: Hammer,
  backlog: Lightbulb,
  homelab: Server,
  notify: Bell,
  mcp: Plug,
};

export function categoryOf(kind: string): ActivityCategory {
  if (kind.startsWith("chat.")) return "chat";
  if (kind === "llm") return "llm";
  if (kind === "tool") return "tool";
  if (kind === "approval") return "approval";
  if (kind === "automation") return "automation";
  if (kind.startsWith("job")) return "job";
  if (kind === "backlog") return "backlog";
  if (kind === "gw.notify") return "notify";
  if (kind === "gw.mcp") return "mcp";
  return "homelab";
}

export function iconFor(kind: string): ComponentType<{ className?: string }> {
  if (kind === "chat.reply") return Bot;
  return CATEGORY_ICON[categoryOf(kind)];
}

/** Same rule as the rest of the console: only problems (and things waiting on Pryce) get color. */
export function statusTone(status: ActivityStatus): string {
  if (status === "error") return "text-destructive";
  if (status === "pending") return "text-accent";
  if (status === "running") return "text-primary";
  return "text-muted";
}

export function statusDot(status: ActivityStatus): string {
  if (status === "error") return "bg-destructive";
  if (status === "pending") return "bg-accent";
  if (status === "running") return "bg-primary animate-pulse";
  if (status === "ok") return "bg-muted/60";
  return "bg-border";
}

export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function ms(value: number | null | undefined): string {
  if (value == null) return "";
  if (value < 1000) return `${value}ms`;
  if (value < 60_000) return `${(value / 1000).toFixed(1)}s`;
  const s = Math.round(value / 1000);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function usd(value: number | null | undefined): string {
  if (value == null) return "";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

/** Where a flow came from, for the row's subtitle. */
export function originLabel(e: ActivityEvent): string {
  const t = e.trace ?? "";
  if (t.startsWith("run:")) return "automation";
  if (t.startsWith("item:")) return "backlog";
  if (t.startsWith("job:")) {
    const by = e.refs.requested_by ?? "";
    if (by === "mcp") return "via MCP";
    if (by === "console") return "from console";
    return "job";
  }
  if (t.startsWith("session:")) {
    const type = e.refs.session_type;
    if (type && type !== "chat") return type;
    return "chat";
  }
  if (t.startsWith("gw:")) return "gateway";
  return "";
}

/** Flows worth opening: anything that belongs to a trace with more than this one event. */
export function hasFlow(e: ActivityEvent): boolean {
  return !!e.trace && !e.trace.startsWith("gw:");
}
