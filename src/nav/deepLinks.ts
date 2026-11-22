import { SUB_CHOICES, isSub, type ItemKind, type ItemRef, type SubKey } from "@/store/navStore";
import { isHub, isView, type NavTarget } from "./hubViews";

export type DeepLink = NavTarget & { items?: ItemRef[]; sub?: { key: SubKey; value: string } };

/** Kinds a phone notice can open with `?open=<kind>:<id>`; each has a GET that confirms the id. */
export const OPEN_KINDS = ["backlog", "job", "automation", "dispatch", "service"] as const satisfies readonly ItemKind[];
export type OpenKind = (typeof OPEN_KINDS)[number];

// Same rule as the gateway's REF_ID (api-gateway app/notices.py), so its links always parse.
const OPEN_ID = /^[A-Za-z0-9._-]{1,200}$/;

/** `?open=<kind>:<id>`, the form phone notices link to, or null. */
export function parseOpenLink(search: string): { kind: OpenKind; id: string } | null {
  const raw = new URLSearchParams(search).get("open");
  if (!raw) return null;
  const at = raw.indexOf(":");
  const kind = raw.slice(0, at);
  const id = raw.slice(at + 1);
  if (at < 1 || !(OPEN_KINDS as readonly string[]).includes(kind) || !OPEN_ID.test(id)) return null;
  return { kind: kind as OpenKind, id };
}

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
  const [hub, view, sub, ...rest] = page.split(".");
  if (rest.length || !isHub(hub)) return HOME;
  if (view === undefined) return { hub } as DeepLink;
  if (!isView(hub, view)) return HOME;
  if (sub === undefined) return { hub, view } as DeepLink;
  const key = `${hub}:${view}`;
  if (!Object.prototype.hasOwnProperty.call(SUB_CHOICES, key) || !isSub(key as SubKey, sub)) return HOME;
  return { hub, view, sub: { key: key as SubKey, value: sub } } as DeepLink;
}
