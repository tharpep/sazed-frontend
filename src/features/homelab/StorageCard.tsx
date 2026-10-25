import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { errorText, fetchStorage, type LibraryTotal, type StorageResponse } from "@/api/homelab";
import { Fact, gib, pct } from "./format";

const REFRESH_MS = 60_000; // sizes move slowly; Sonarr/Radarr don't need polling every 30s

function library(t: LibraryTotal | null): string {
  return t ? `${t.count} · ${gib(t.bytes)} GB` : "Not connected";
}

/** Real free space for media (the pool behind the media disk, not df inside CT 100), the
 * library by size, finished downloads that never reached Jellyfin, and disk per container.
 * `full` is the Homelab page's Storage tab: every pool, more items, containers expanded. */
export function StorageCard({ className, full = false }: { className?: string; full?: boolean }) {
  const [data, setData] = useState<StorageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (document.hidden) return;
      fetchStorage()
        .then((d) => {
          if (cancelled) return;
          setData(d);
          setError(null);
        })
        .catch((e) => !cancelled && setError(errorText(e)));
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  if (!data) {
    return (
      <section aria-label="Storage" className={className}>
        <p className={cn("text-sm", error ? "text-destructive" : "text-muted")}>
          {error ? `Couldn't load storage: ${error}` : "Loading storage…"}
        </p>
      </section>
    );
  }

  const { media } = data;
  const pool = data.pools.find((p) => p.name === media.pool);
  const notImported = media.downloads?.not_imported ?? [];

  return (
    <section aria-label="Storage" className={cn("flex flex-col gap-2.5", className)}>
      {full && (
        <>
          <h2 className="text-sm font-medium text-muted">Pools</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
            {data.pools.map((p) => (
              <Fact
                key={p.name}
                label={p.name}
                value={`${gib(p.free_bytes)} GB free`}
                note={`${pct(p.used_bytes, p.total_bytes)} of ${gib(p.total_bytes)} GB used${p.name === media.pool ? " · holds media" : ""}`}
              />
            ))}
          </div>
        </>
      )}
      <h3 className={cn("text-sm font-medium", full ? "mt-2 text-muted" : "text-ink")}>
        {full ? "Media" : "Storage"}
      </h3>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
        <Fact
          label="Free for media"
          value={media.free_bytes == null ? "Unknown" : `${gib(media.free_bytes)} GB`}
          note={
            pool
              ? `${pool.name}, ${pct(pool.used_bytes, pool.total_bytes)} of ${gib(pool.total_bytes)} GB used`
              : (media.volume ?? undefined)
          }
        />
        <Fact label="Series" value={library(media.series)} />
        <Fact label="Movies" value={library(media.movies)} />
        <Fact
          label="Torrents"
          value={media.downloads ? `${media.downloads.torrents} · ${gib(media.downloads.bytes)} GB` : "Not connected"}
          note="Hardlinked, so imported ones don't count twice"
        />
      </div>

      {notImported.length > 0 && (
        <div className="text-[13px]">
          <p className="font-medium text-ink">Downloaded but not in the library</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-muted">
            {notImported.map((t) => (
              <li key={t.name} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{t.name}</span>
                <span className="shrink-0 tabular-nums">{gib(t.bytes)} GB</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {media.largest.length > 0 && (
        <div className="text-[13px]">
          <p className="font-medium text-ink">Largest</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-muted">
            {media.largest.slice(0, full ? 10 : 5).map((i) => (
              <li key={`${i.kind}:${i.title}`} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {i.title} <span className="text-xs">({i.kind})</span>
                </span>
                <span className="shrink-0 tabular-nums">{gib(i.bytes)} GB</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="text-[13px]" open={full}>
        <summary className="cursor-pointer font-medium text-ink">Disk by container</summary>
        <ul className="mt-1 flex flex-col gap-0.5 text-muted">
          {data.containers.map((c) => (
            <li key={c.vmid} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                CT {c.vmid} {c.name}
                {c.status !== "running" && <span className="text-xs"> ({c.status})</span>}
              </span>
              <span className="shrink-0 tabular-nums">
                {c.status === "running" ? `${gib(c.used_bytes)} / ${gib(c.total_bytes)} GB` : `${gib(c.total_bytes)} GB disk`}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-muted">
          Root disks only. CT {media.vmid}'s media disk is the Series, Movies and Torrents above.
        </p>
      </details>

      {(data.errors.length > 0 || error) && (
        <p className="text-xs text-muted">
          {[...data.errors, ...(error ? [`refresh failed: ${error}`] : [])].join(" · ")}
        </p>
      )}
    </section>
  );
}
