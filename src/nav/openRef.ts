import type { ItemKind } from "@/store/navStore";
import { isHub } from "./hubViews";

/** Kinds a phone notice can open with `?open=<kind>:<id>`; each has a GET that confirms the id. */
export const OPEN_KINDS = ["backlog", "job", "automation", "dispatch", "service"] as const satisfies readonly ItemKind[];
export type OpenKind = (typeof OPEN_KINDS)[number];

// Same rule as the gateway's REF_ID (api-gateway app/notices.py), so its links always parse. Dots
// alone are refused: fetch resolves `.` and `..` in a path to another route.
const OPEN_ID = /^(?!\.+$)[A-Za-z0-9._-]{1,200}$/;

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

/** An https console link in a shape the console opens: `?open=<kind>:<id>` or `?page=<hub>...`. */
export function isConsoleLink(href: string): boolean {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (parseOpenLink(url.search)) return true;
  const page = url.searchParams.get("page");
  return !!page && isHub(page.split(".")[0]);
}
