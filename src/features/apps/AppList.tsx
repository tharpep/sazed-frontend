import type { Service } from "@/api/homelab";
import { toneDot } from "@/components/system";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, statusOf } from "@/features/homelab/format";

// The console itself is where you already are, so it gets no link.
const HIDDEN = new Set(["sazed-console"]);

/** Links to LAN addresses only open at home; tailnet (*.ts.net) ones open anywhere. */
function homeOnly(url: string): boolean {
  try {
    return !new URL(url).hostname.endsWith(".ts.net");
  } catch {
    return false;
  }
}

/** Two letters: the initials of a two-word name ("AdGuard Home" → AH), else its first two letters. */
function monogram(name: string): string {
  const words = name.split(/[\s()]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

/** Registry services with an open_url, apps first and then the homelab's own admin pages. */
export function openableApps(services: Service[]): Service[] {
  const openable = services.filter((s) => s.open_url && s.lifecycle !== "planned" && !HIDDEN.has(s.id));
  return [...openable.filter((s) => s.group === "apps"), ...openable.filter((s) => s.group !== "apps")];
}

/** Home's app launcher as a short text list. The caller drops private apps until they're revealed. */
export function AppList({ apps }: { apps: Service[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 @3xl:grid-cols-5">
      {apps.map((s) => (
        <li key={s.id} className="min-w-0">
          <AppLink service={s} />
        </li>
      ))}
    </ul>
  );
}

function AppLink({ service: s }: { service: Service }) {
  const kind = statusOf(s);
  // Healthy stays quiet: only down and maintenance get a dot.
  const flagged = kind === "down" || kind === "maintenance";
  return (
    <a
      href={s.open_url!}
      target="_blank"
      rel="noreferrer"
      title={`${s.description}${flagged ? ` (${STATUS_LABEL[kind]})` : ""}`}
      className="flex items-center gap-2.5 rounded-md py-1.5 text-body text-ink-2 transition-colors hover:text-ink"
    >
      <span
        className="grid size-5.5 flex-none place-items-center rounded-md bg-raised text-[10px] font-semibold text-muted"
        aria-hidden="true"
      >
        {monogram(s.name)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="break-words">{s.name}</span>
          {flagged && (
            <span
              role="img"
              aria-label={STATUS_LABEL[kind]}
              className={cn("size-1.5 flex-none rounded-full", toneDot[kind === "down" ? "err" : "warn"])}
            />
          )}
        </span>
        {homeOnly(s.open_url!) && <span className="text-caption text-muted">Home only</span>}
      </span>
    </a>
  );
}
