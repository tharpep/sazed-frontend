import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch } from "@/api/client";
import {
  fetchTasksDueToday,
  fetchUnreadEmail,
  fetchUpcomingCalendar,
  fetchWeather,
  type CalendarEvent,
  type EmailData,
  type Task,
  type WeatherData,
} from "@/api/display";
import { getActivitySummary } from "@/api/activity";
import { listAutomations, type Automation } from "@/api/automations";
import { fetchServices, fetchStorage, type Service } from "@/api/homelab";
import { listWaitingJobs, type JobSummary } from "@/api/jobs";

const MIN = 60_000;
const COORDS_KEY = "sazed-display-coords";

/** Polls `fetcher` every `ms` and on becoming visible. Keeps the last good value through errors,
 * so one flaky source never blanks the screen; `null` means it hasn't loaded yet. */
function usePolled<T>(fetcher: () => Promise<T>, ms: number): T | null {
  const [data, setData] = useState<T | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(() => {
    fetcherRef.current().then(setData, () => undefined);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, ms);
    const onVisible = () => !document.hidden && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, ms]);

  return data;
}

/** The last position is cached: a kiosk can lose its location permission or fix, and the
 * forecast for where it was an hour ago is still right. */
async function weatherHere(): Promise<WeatherData> {
  const fresh = await new Promise<{ lat: number; lon: number } | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
      () => resolve(null),
      { timeout: 10_000, maximumAge: 6 * 60 * MIN }
    );
  });
  if (fresh) localStorage.setItem(COORDS_KEY, JSON.stringify(fresh));
  const coords = fresh ?? (JSON.parse(localStorage.getItem(COORDS_KEY) ?? "null") as typeof fresh);
  if (!coords) throw new Error("No location for the weather");
  return fetchWeather(coords.lat, coords.lon);
}

async function sazedOnline(): Promise<boolean> {
  try {
    await apiFetch("/health");
    return true;
  } catch {
    return false;
  }
}

export interface DisplayFeed {
  events: CalendarEvent[] | null;
  tasksDue: Task[] | null;
  mail: EmailData | null;
  waiting: JobSummary[] | null;
  approvals: number;
  services: Service[] | null;
  mediaFree: number | null;
  automations: Automation[] | null;
  weather: WeatherData | null;
  online: boolean;
}

export function useDisplayFeed(): DisplayFeed {
  const events = usePolled(() => fetchUpcomingCalendar().then((d) => d.events), 5 * MIN);
  const tasksDue = usePolled(() => fetchTasksDueToday().then((d) => d.tasks), 10 * MIN);
  const mail = usePolled(fetchUnreadEmail, 5 * MIN);
  const waiting = usePolled(listWaitingJobs, MIN);
  const summary = usePolled(getActivitySummary, MIN);
  const services = usePolled(() => fetchServices().then((d) => d.services), MIN);
  const storage = usePolled(fetchStorage, 15 * MIN);
  const automations = usePolled(listAutomations, 15 * MIN);
  const weather = usePolled(weatherHere, 30 * MIN);
  const online = usePolled(sazedOnline, MIN);

  return {
    events,
    tasksDue,
    mail,
    waiting,
    approvals: summary?.now.approvals_pending ?? 0,
    services:
      services
        ?.filter((s) => s.lifecycle !== "planned")
        .map((s) => (s.private ? { ...s, name: "A private service" } : s)) ?? null,
    mediaFree: storage?.media.free_bytes ?? null,
    automations,
    weather,
    online: online ?? true,
  };
}
