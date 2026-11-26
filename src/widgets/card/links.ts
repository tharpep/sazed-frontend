import { isConsoleLink } from "@/nav/openRef";

import type { CardLink } from "./marks";

/** An https link on github.com, the only place a PR link may point. */
export function isGitHubLink(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "https:" && url.hostname === "github.com";
  } catch {
    return false;
  }
}

export const githubLink = (label: string, href: string): CardLink => ({ label, href, safe: isGitHubLink(href) });

export const consoleLink = (label: string, href: string): CardLink => ({ label, href, safe: isConsoleLink(href) });
