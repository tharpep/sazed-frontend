import { useState } from "react";

import type { Service } from "@/api/homelab";
import { StatusDot, STATUS_LABEL, statusOf } from "@/features/homelab/format";
import { launchableApps } from "@/nav/paletteSources";
import { useUiStore } from "@/store/uiStore";
import { appsLead } from "./appsLead";

// Icons come from homarr-labs/dashboard-icons by the registry's `icon` slug. PNG because a few
// apps have no SVG there.
const ICON_BASE = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png";

const GROUPS: { key: string; label: string; match: (s: Service) => boolean }[] = [
  { key: "apps", label: "Apps", match: (s) => s.group === "apps" },
  { key: "admin", label: "Homelab", match: (s) => s.group !== "apps" },
];

/** Links to LAN addresses only open at home; tailnet (*.ts.net) ones open anywhere. */
function homeOnly(url: string): boolean {
  try {
    return !new URL(url).hostname.endsWith(".ts.net");
  } catch {
    return false;
  }
}

/** The launcher: a lead line, then tiles for the palette's app list, split into Apps and Homelab.
 * Private apps stay out until revealed on Home. */
export function AppGrid({ services }: { services: Service[] }) {
  const privateRevealed = useUiStore((s) => s.privateRevealed);
  const apps = launchableApps(services, privateRevealed);
  const groups = GROUPS.map((g) => ({ ...g, apps: apps.filter(g.match) })).filter((g) => g.apps.length > 0);

  return (
    <>
      <div>
        <p className="text-title font-medium text-ink">{appsLead(apps)}</p>
        <p className="mt-0.5 text-meta text-muted">Each opens in a new tab.</p>
      </div>
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`apps-${g.key}`}>
          <h2 id={`apps-${g.key}`} className="flex min-h-7 items-center gap-2 px-1 pb-1 text-meta font-medium text-ink-2">
            {g.label}{" "}
            <span className="font-normal text-muted tabular-nums">{g.apps.length}</span>
          </h2>
          {/* Four columns on phones; from 640px the columns grow with the page. */}
          <ul className="mt-0.5 grid grid-cols-4 gap-x-1 gap-y-1.5 sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))]">
            {g.apps.map((s) => (
              <li key={s.id} className="min-w-0">
                <AppTile service={s} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function AppTile({ service: s }: { service: Service }) {
  const kind = statusOf(s);
  const local = homeOnly(s.open_url!);
  // Healthy stays quiet (house rule: only down and maintenance get color).
  const flagged = kind === "down" || kind === "maintenance";
  const state = kind === "down" ? ", down" : kind === "maintenance" ? ", in maintenance" : "";
  return (
    <a
      href={s.open_url!}
      target="_blank"
      rel="noreferrer"
      title={`${s.description}${flagged ? ` (${STATUS_LABEL[kind]})` : ""}`}
      aria-label={`Open ${s.name}${state}${local ? ", home only" : ""}`}
      className="flex min-h-24 flex-col items-center gap-1.5 rounded-[14px] px-0.5 pt-2.5 pb-2 text-center text-caption text-ink-2 transition-colors hover:bg-surface hover:text-ink active:bg-surface"
    >
      <span className="relative grid size-14 shrink-0 place-items-center rounded-[15px] border border-line bg-surface">
        <AppIcon service={s} />
        {flagged && <StatusDot kind={kind} className="absolute -top-[3px] -right-[3px] size-3 ring-2 ring-bg" />}
      </span>
      <span className="max-w-full wrap-break-word">{s.name}</span>
      {local && <span className="-mt-1 leading-[14px] text-muted">home only</span>}
    </a>
  );
}

function AppIcon({ service: s }: { service: Service }) {
  const [failed, setFailed] = useState(false);
  if (!s.icon || failed) {
    return <span className="font-mono text-[15px] font-medium text-ink">{s.name.charAt(0)}</span>;
  }
  return (
    <img
      src={`${ICON_BASE}/${s.icon}.png`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-9 object-contain"
    />
  );
}
