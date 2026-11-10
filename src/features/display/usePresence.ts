import { useCallback, useState } from "react";

export type Tier = "idle" | "far" | "near";
export type Sighting = "near" | "far";

const NEAR_MS = 2 * 60_000;
const FAR_MS = 10 * 60_000;

function tierAt(now: number, lastNear: number, lastSeen: number): Tier {
  if (now - lastNear < NEAR_MS) return "near";
  if (now - lastSeen < FAR_MS) return "far";
  return "idle";
}

export function usePresence(now: Date): { tier: Tier; seen: (kind: Sighting) => void } {
  const [last, setLast] = useState(() => ({ near: Date.now(), seen: Date.now() }));
  const seen = useCallback((kind: Sighting) => {
    const t = Date.now();
    setLast((l) => ({ near: kind === "near" ? t : l.near, seen: t }));
  }, []);
  return { tier: tierAt(now.getTime(), last.near, last.seen), seen };
}
