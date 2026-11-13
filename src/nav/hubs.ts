import type { ComponentType } from "react";

import { ActivityPage } from "@/features/activity/ActivityPage";
import { AppsPage } from "@/features/apps/AppsPage";
import { AutomationsPage } from "@/features/automations/AutomationsPage";
import { BacklogPage } from "@/features/backlog/BacklogPage";
import { MessageList } from "@/features/chat/MessageList";
import { ClaudeUsagePage } from "@/features/claude-usage/ClaudeUsagePage";
import { GatewayPage } from "@/features/gateway/GatewayPage";
import { HomePage } from "@/features/home/HomePage";
import { HomelabPage } from "@/features/homelab/HomelabPage";
import { JournalPage } from "@/features/journal/JournalPage";
import { KnowledgePage } from "@/features/kb/KnowledgePage";
import { PlansPage } from "@/features/plans/PlansPage";
import { DispatchRunsPage } from "@/features/plans/DispatchRunsPage";
import { ProfilesPage } from "@/features/profiles/ProfilesPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { HUB_VIEWS, type HubId, type ViewKey } from "./hubViews";

const COMPONENTS: Record<ViewKey, ComponentType> = {
  "home:home": HomePage,
  "chat:list": MessageList,
  "chat:conversation": MessageList,
  "work:projects": ProjectsPage,
  "work:board": BacklogPage,
  "work:plans": PlansPage,
  "agents:runs": DispatchRunsPage,
  "agents:automations": AutomationsPage,
  "agents:profiles": ProfilesPage,
  "agents:mcp": ProfilesPage,
  "system:homelab": HomelabPage,
  "system:activity": ActivityPage,
  "system:usage": ClaudeUsagePage,
  "system:integrations": GatewayPage,
  "library:knowledge": KnowledgePage,
  "library:journal": JournalPage,
  "apps:apps": AppsPage,
};

export const HUBS = HUB_VIEWS.map((hub) => ({
  id: hub.id as HubId,
  label: hub.label,
  views: hub.views.map((view) => ({
    id: view.id,
    label: view.label,
    component: COMPONENTS[`${hub.id}:${view.id}` as ViewKey],
  })),
}));

export function viewDef(hub: HubId, view: string) {
  const views = HUBS.find((h) => h.id === hub)!.views;
  return views.find((v) => v.id === view) ?? views[0];
}
