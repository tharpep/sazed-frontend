import type { ItemRef } from "@/store/navStore";
import { isHub, isView, type NavTarget } from "./hubViews";

export type DeepLink = NavTarget & { items?: ItemRef[] };

const LEGACY_PAGES = new Map<string, NavTarget>(Object.entries({
  backlog: { hub: "work", view: "board" },
  projects: { hub: "work", view: "projects" },
  plans: { hub: "work", view: "plans" },
  profiles: { hub: "agents", view: "profiles" },
  automations: { hub: "agents", view: "automations" },
  homelab: { hub: "system", view: "homelab" },
  activity: { hub: "system", view: "activity" },
  "claude-usage": { hub: "system", view: "usage" },
  kb: { hub: "library", view: "knowledge" },
  journal: { hub: "library", view: "journal" },
} satisfies Record<string, NavTarget>));

const HOME: DeepLink = { hub: "home" };

function positiveInt(raw: string | null): number | undefined {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n > 0 ? n : undefined;
}

function legacyItem(page: string, params: URLSearchParams): DeepLink | null {
  const value = (key: string) => params.get(key) || null;
  const item = value("item");
  const project = value("project");
  const profile = value("profile");
  const plan = value("plan");
  const dispatch = value("dispatch");
  if (page === "backlog" && item) return { hub: "work", view: "board", items: [{ kind: "backlog", id: item }] };
  if (page === "projects" && project)
    return { hub: "work", view: "projects", items: [{ kind: "project", id: project }] };
  if (page === "profiles" && profile)
    return { hub: "agents", view: "profiles", items: [{ kind: "profile", id: profile }] };
  if (page !== "plans" || (!plan && !dispatch)) return null;
  const version = positiveInt(params.get("version"));
  const items: ItemRef[] = [];
  if (plan) items.push({ kind: "plan", id: plan, ...(version && { version }) });
  if (dispatch) items.push({ kind: "dispatch", id: dispatch });
  return dispatch ? { hub: "agents", view: "runs", items } : { hub: "work", view: "plans", items };
}

export function parseDeepLink(search: string): DeepLink | null {
  const params = new URLSearchParams(search);
  const page = params.get("page");
  if (!page) return null;
  const legacy = LEGACY_PAGES.get(page);
  if (legacy) return legacyItem(page, params) ?? legacy;
  const [hub, view, ...rest] = page.split(".");
  if (rest.length || !isHub(hub)) return HOME;
  if (view === undefined) return { hub } as DeepLink;
  return isView(hub, view) ? ({ hub, view } as DeepLink) : HOME;
}
