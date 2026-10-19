import { useEffect, useRef, useState } from "react";

import { listActivity, streamActivity, type ActivityEvent } from "@/api/activity";
import type { ArchMap } from "@/api/homelab";
import { edgeKey, edgesFor } from "./mapGeometry";

const WINDOW_MS = 15 * 60_000; // traffic counts (line speed) look back this far
const HOT_MS = 2500; // how long a line stays lit after an event
const KEEP = 400; // recent events kept for node panels

export interface MapTraffic {
  live: boolean;
  /** Matching events per edge in the last 15 minutes. */
  counts: Record<string, number>;
  /** Edges lit right now. */
  hot: Set<string>;
  recent: ActivityEvent[];
}

/** Live traffic for the map: recent Activity to start, then the live stream. Each event lights
 * the lines whose signals match it; job steps light the worker's line to its model. */
export function useMapTraffic(map: ArchMap | null): MapTraffic {
  const mapRef = useRef(map);
  mapRef.current = map;
  const jobAgents = useRef<Record<string, string>>({});
  const [recent, setRecent] = useState<ActivityEvent[]>([]);
  const [hits, setHits] = useState<{ key: string; at: number }[]>([]);
  const [hotUntil, setHotUntil] = useState<Record<string, number>>({});
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    function record(e: Pick<ActivityEvent, "kind" | "title" | "refs">, at: number, light: boolean) {
      const m = mapRef.current;
      if (!m) return;
      const keys = edgesFor(m, e).map(edgeKey);
      if (!keys.length) return;
      setHits((h) => [...h.filter((x) => x.at > Date.now() - WINDOW_MS), ...keys.map((key) => ({ key, at }))]);
      if (light) {
        const until = Date.now() + HOT_MS;
        setHotUntil((h) => ({ ...h, ...Object.fromEntries(keys.map((k) => [k, until])) }));
      }
    }
    function remember(e: ActivityEvent) {
      if (e.refs.job && e.refs.agent) jobAgents.current[e.refs.job] = e.refs.agent;
    }

    const ctrl = new AbortController();
    (async () => {
      try {
        const initial = await listActivity([], false);
        const ordered = [...initial].reverse();
        ordered.forEach(remember);
        setRecent(initial.slice(0, KEEP));
        for (const e of ordered) record(e, Date.parse(e.at), false);
      } catch {
        // the map still works without history
      }
      let delay = 1000;
      while (!ctrl.signal.aborted) {
        try {
          await streamActivity(
            undefined,
            {
              onReady: () => {
                delay = 1000;
                setLive(true);
              },
              onEvent: (e) => {
                remember(e);
                setRecent((r) => [e, ...r].slice(0, KEEP));
                record(e, Date.now(), true);
              },
              onStep: (s) => {
                const agent = jobAgents.current[s.job];
                record({ kind: "job.step", title: "", refs: { job: s.job, agent } }, Date.now(), true);
              },
            },
            ctrl.signal
          );
        } catch {
          // dropped; retried below
        }
        if (ctrl.signal.aborted) break;
        setLive(false);
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 15_000);
      }
    })();
    return () => ctrl.abort();
  }, []);

  // Ticks while lines are lit (to turn them off) and every 30s (to age the counts).
  const anyHot = Object.values(hotUntil).some((t) => t > now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), anyHot ? 500 : 30_000);
    return () => clearInterval(id);
  }, [anyHot]);

  const counts: Record<string, number> = {};
  for (const h of hits) if (h.at > now - WINDOW_MS) counts[h.key] = (counts[h.key] ?? 0) + 1;
  const hot = new Set(Object.entries(hotUntil).filter(([, t]) => t > now).map(([k]) => k));
  return { live, counts, hot, recent };
}
