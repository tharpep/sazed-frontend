import { useState } from "react";

import type { Service } from "@/api/homelab";
import { StatusDot, STATUS_LABEL, statusOf } from "@/features/homelab/format";

// Icons come from homarr-labs/dashboard-icons by the registry's `icon` slug. PNG because a few
// apps have no SVG there.
const ICON_BASE = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png";

// The console itself is where you already are, so it gets no tile.
const HIDDEN = new Set(["sazed-console"]);

const SECTIONS: { key: string; label: string; match: (s: Service) => boolean }[] = [
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

/** Launcher tiles for every registry service with an open_url, split into Apps and Homelab.
 * The caller decides which services to pass (Home drops private ones until revealed). */
export function AppGrid({ services }: { services: Service[] }) {
  const openable = services.filter((s) => s.open_url && s.lifecycle !== "planned" && !HIDDEN.has(s.id));
  const sections = SECTIONS.map((sec) => ({ ...sec, apps: openable.filter(sec.match) })).filter(
    (sec) => sec.apps.length > 0
  );

  return (
    <>
      {sections.map((sec) => (
        <section key={sec.key} aria-labelledby={`apps-${sec.key}`}>
          <h2 id={`apps-${sec.key}`} className="px-1 pb-2 text-sm font-medium text-muted">
            {sec.label}
          </h2>
          <ul className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5">
            {sec.apps.map((s) => (
              <li key={s.id}>
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
  return (
    <a
      href={s.open_url!}
      target="_blank"
      rel="noreferrer"
      title={`${s.description}${flagged ? ` (${STATUS_LABEL[kind]})` : ""}`}
      className="group flex flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-center transition-colors hover:bg-surface"
    >
      <span className="relative">
        <AppIcon service={s} />
        {flagged && (
          <StatusDot
            kind={kind}
            className="absolute -right-0.5 -top-0.5 size-3 ring-2 ring-bg"
          />
        )}
      </span>
      <span className="line-clamp-2 text-xs leading-tight text-ink">{s.name}</span>
      {local && <span className="text-[10px] leading-none text-muted">home only</span>}
    </a>
  );
}

function AppIcon({ service: s }: { service: Service }) {
  const [failed, setFailed] = useState(false);
  if (!s.icon || failed) {
    return (
      <span className="flex size-12 items-center justify-center rounded-xl bg-surface text-lg font-semibold text-muted">
        {s.name.charAt(0)}
      </span>
    );
  }
  return (
    <img
      src={`${ICON_BASE}/${s.icon}.png`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-12 rounded-xl bg-surface object-contain p-1.5"
    />
  );
}
