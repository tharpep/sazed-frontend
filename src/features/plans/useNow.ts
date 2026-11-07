import { useEffect, useState } from "react";

let serverOffsetMs = 0;

export function syncServerClock(serverNow: string | undefined): void {
  if (serverNow) serverOffsetMs = Date.parse(serverNow) - Date.now();
}

const serverNowMs = () => Date.now() + serverOffsetMs;

export function useNow(active: boolean): number {
  const [now, setNow] = useState(serverNowMs);
  useEffect(() => {
    if (!active) return;
    setNow(serverNowMs());
    const id = setInterval(() => setNow(serverNowMs()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}
