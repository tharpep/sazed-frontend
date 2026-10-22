import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { errorText, fetchServices, type Service } from "@/api/homelab";
import { StatusDot, STATUS_LABEL, statusOf } from "@/features/homelab/format";

// Icons come from homarr-labs/dashboard-icons by the registry's `icon` slug. PNG because a few
// apps (SillyTavern) have no SVG there.
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

export function AppsPage() {
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setServices((await fetchServices()).services);
      setError(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Health dots only; no polling loop. Refresh when the page comes back into view.
  useEffect(() => {
    load();
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const sections = useMemo(() => {
    const openable = (services ?? []).filter(
      (s) => s.open_url && s.lifecycle !== "planned" && !HIDDEN.has(s.id)
    );
    return SECTIONS.map((sec) => ({ ...sec, apps: openable.filter(sec.match) })).filter(
      (sec) => sec.apps.length > 0
    );
  }, [services]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold text-ink">Apps</h1>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Refresh"
          title="Refresh"
          className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-4 pb-8">
          {error && !services && <p className="text-sm text-destructive">Couldn't load apps: {error}</p>}
          {!services && !error && <p className="text-sm text-muted">Loading…</p>}
          {services && sections.length === 0 && (
            <p className="text-sm text-muted">No apps have a link in the registry yet.</p>
          )}

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
        </div>
      </div>
    </div>
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
