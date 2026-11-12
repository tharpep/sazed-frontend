import type { ItemRef } from "@/store/navStore";
import { isHub, isView, type NavTarget } from "./hubViews";

export type DeepLink = NavTarget & { item?: ItemRef; apps?: true };

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
  if (page === "backlog" && item) return { hub: "work", view: "board", item: { kind: "backlog", id: item } };
  if (page === "projects" && project)
    return { hub: "work", view: "projects", item: { kind: "project", id: project } };
  if (page === "profiles" && profile)
    return { hub: "agents", view: "profiles", item: { kind: "profile", id: profile } };
  if (page === "plans" && dispatch) return { hub: "agents", view: "runs", item: { kind: "dispatch", id: dispatch } };
  if (page === "plans" && plan) {
    const version = positiveInt(params.get("version"));
    return { hub: "work", view: "plans", item: { kind: "plan", id: plan, ...(version && { version }) } };
  }
  return null;
}

export function parseDeepLink(search: string): DeepLink | null {
  const params = new URLSearchParams(search);
  const page = params.get("page");
  if (!page) return null;
  if (page === "apps") return { hub: "home", apps: true };
  const legacy = LEGACY_PAGES.get(page);
  if (legacy) return legacyItem(page, params) ?? legacy;
  const [hub, view, ...rest] = page.split(".");
  if (rest.length || !isHub(hub)) return HOME;
  if (view === undefined) return { hub } as DeepLink;
  return isView(hub, view) ? ({ hub, view } as DeepLink) : HOME;
}
