interface ViewDef {
  id: string;
  label: string;
}

interface HubDef {
  id: string;
  label: string;
  views: readonly [ViewDef, ...ViewDef[]];
}

export const HUB_VIEWS = [
  { id: "home", label: "Home", views: [{ id: "home", label: "Home" }] },
  {
    id: "chat",
    label: "Chat",
    views: [
      { id: "list", label: "Conversations" },
      { id: "conversation", label: "Conversation" },
    ],
  },
  {
    id: "work",
    label: "Work",
    views: [
      { id: "projects", label: "Projects" },
      { id: "board", label: "Board" },
      { id: "plans", label: "Plans" },
    ],
  },
  {
    id: "agents",
    label: "Agents",
    views: [
      { id: "runs", label: "Runs" },
      { id: "automations", label: "Automations" },
      { id: "profiles", label: "Profiles" },
      { id: "mcp", label: "MCP servers" },
    ],
  },
  {
    id: "system",
    label: "System",
    views: [
      { id: "homelab", label: "Homelab" },
      { id: "activity", label: "Activity" },
      { id: "usage", label: "Usage" },
      { id: "integrations", label: "Integrations" },
    ],
  },
  {
    id: "library",
    label: "Library",
    views: [
      { id: "knowledge", label: "Knowledge" },
      { id: "journal", label: "Journal" },
    ],
  },
  { id: "apps", label: "Apps", views: [{ id: "apps", label: "Apps" }] },
] as const satisfies readonly HubDef[];

type Hub = (typeof HUB_VIEWS)[number];
export type HubId = Hub["id"];
export type ViewId<H extends HubId> = Extract<Hub, { id: H }>["views"][number]["id"];
export type NavTarget = { [H in HubId]: { hub: H; view?: ViewId<H> } }[HubId];
export type ViewKey = { [H in HubId]: `${H}:${ViewId<H>}` }[HubId];

function hubDef(hub: HubId): HubDef {
  return HUB_VIEWS.find((h) => h.id === hub)!;
}

export function isHub(id: string): id is HubId {
  return HUB_VIEWS.some((h) => h.id === id);
}

export function isView<H extends HubId>(hub: H, id: string): id is ViewId<H> {
  return hubDef(hub).views.some((v) => v.id === id);
}

export function firstView<H extends HubId>(hub: H): ViewId<H> {
  return hubDef(hub).views[0].id as ViewId<H>;
}
