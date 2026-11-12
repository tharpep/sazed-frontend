import type { ComponentType } from "react";
import { Bot, House, LayoutGrid, Library, MessageSquare, Server, SquareKanban } from "lucide-react";

import { HUB_VIEWS, type HubId } from "@/nav/hubViews";

export interface ShellAction {
  label: string;
  onClick: () => void;
}

type Icon =ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

export const HUB_ICON: Record<HubId, Icon> = {
  home: House,
  chat: MessageSquare,
  work: SquareKanban,
  agents: Bot,
  system: Server,
  library: Library,
  apps: LayoutGrid,
};

// "MCP servers" is the only view label too long for a 360px header tab row.
const SHORT_LABEL: Record<string, string> = { "agents:mcp": "MCP" };

export const PHONE_BAR_HUBS = ["home", "chat", "work", "apps"] as const satisfies readonly HubId[];
export const MORE_HUBS = ["agents", "system", "library"] as const satisfies readonly HubId[];

export function hubDef(hub: HubId) {
  return HUB_VIEWS.find((h) => h.id === hub)!;
}

export function shortLabel(hub: HubId, view: { id: string; label: string }) {
  return SHORT_LABEL[`${hub}:${view.id}`] ?? view.label;
}

// Chat's list and conversation are one screen with a Back button, not tabs.
export function hasViewTabs(hub: HubId) {
  return hub !== "chat" && hubDef(hub).views.length > 1;
}
