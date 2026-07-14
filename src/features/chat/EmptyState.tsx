import { useEffect, useState } from "react";

import { useIsMobile } from "@/hooks/useIsMobile";
import { useDisplayData } from "@/hooks/useDisplayData";
import type { DisplayData } from "@/hooks/useDisplayData";
import { fetchWeather } from "@/api/display";
import type { WeatherData } from "@/api/display";
import { useChatStore } from "@/store/chatStore";
import { Composer } from "@/features/chat/Composer";

const NAME = "Pryce";

function getPeriod(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function weatherPhrase(w: WeatherData | null): string | null {
  if (!w) return null;
  const c = w.condition.toLowerCase();
  const phrase = c === "clear" ? "clear skies" : c === "mostly clear" ? "mostly clear skies" : c;
  return `${phrase}, ${w.temp}°`;
}

/* Sazed's one-line brief, composed from whatever the day's data has loaded
   so far. Calm, glanceable, degrades gracefully while data is still arriving. */
function buildBrief(period: string, data: DisplayData, weather: WeatherData | null): string {
  const calReady = data.calendar.data !== null;
  const taskReady = data.tasks.data !== null;

  if (!calReady && !taskReady) {
    return data.calendar.error && data.tasks.error ? "I couldn't reach your day just now." : "Gathering your day…";
  }

  const meetings = data.calendar.data?.events.length ?? 0;
  const due = data.tasks.data?.count ?? 0;

  let day: string;
  if (meetings === 0 && due === 0) day = `A quiet ${period}.`;
  else if (meetings > 0 && due > 0) day = `${cap(plural(meetings, "meeting"))} ahead, ${plural(due, "task")} due today.`;
  else if (meetings > 0) day = `${cap(plural(meetings, "meeting"))} ahead, nothing due.`;
  else day = `Calendar's clear, ${plural(due, "task")} due today.`;

  const wp = weatherPhrase(weather);
  return wp ? `${day} ${cap(wp)}.` : day;
}

const PILLS: { label: string; message: string }[] = [
  { label: "What's on today?", message: "What's on my calendar and tasks for today?" },
  { label: "Catch me up", message: "Catch me up on anything I've missed — emails, tasks, updates" },
  { label: "What's due this week?", message: "What do I have due this week?" },
  { label: "How's my day looking?", message: "How's my day looking overall?" },
];

export function EmptyState() {
  const send = useChatStore((s) => s.send);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const displayData = useDisplayData();
  const isMobile = useIsMobile();

  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetchWeather()
      .then(setWeather)
      .catch(() => setWeather(null));
  }, []);

  const period = getPeriod();
  const brief = buildBrief(period, displayData, weather);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <h1 className="font-display text-3xl text-ink" style={{ letterSpacing: "-0.02em" }}>
          Good {period}, <em className="not-italic text-primary">{NAME}</em>
        </h1>
        <p className="mt-2 text-[0.9375rem] text-muted">{brief}</p>

        <div className="mt-6">
          <Composer onSend={send} disabled={isStreaming} variant="hero" autoFocus={!isMobile} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {PILLS.map(({ label, message }) => (
            <button
              key={label}
              type="button"
              onClick={() => send(message)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/40 hover:text-ink"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
