import { useEffect, useState } from "react";
import { CalendarWidget } from "../../widgets/CalendarWidget";
import { UpcomingWidget } from "../../widgets/UpcomingWidget";
import { TaskWidget } from "../../widgets/TaskWidget";
import { EmailBadge } from "../../widgets/EmailBadge";
import { WeatherWidget } from "../../widgets/WeatherWidget";
import { ClockWidget } from "../../widgets/ClockWidget";
import { useDisplayData } from "../../hooks/useDisplayData";
import type { DisplayData } from "../../hooks/useDisplayData";
import { fetchWeather } from "../../api/display";
import type { WeatherData } from "../../api/display";
import { useChatStore } from "../../store/chatStore";
import { InputBar } from "../../components/InputBar/InputBar";
import styles from "./DashboardEmpty.module.css";

const NAME = "Pryce";

function getPeriod(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
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

/* Sazed's prepared one-line brief — composed from whatever the widgets have
   loaded. Calm, glanceable, degrades gracefully while data is still arriving. */
function buildBrief(
  period: string,
  data: DisplayData,
  weather: WeatherData | null
): string {
  const calReady = data.calendar.data !== null;
  const taskReady = data.tasks.data !== null;

  if (!calReady && !taskReady) {
    return data.calendar.error && data.tasks.error
      ? "I couldn't reach your day just now."
      : "Gathering your day…";
  }

  const meetings = data.calendar.data?.events.length ?? 0;
  const due = data.tasks.data?.count ?? 0;
  const lower = period.toLowerCase();

  let day: string;
  if (meetings === 0 && due === 0) day = `A quiet ${lower}.`;
  else if (meetings > 0 && due > 0) day = `${cap(plural(meetings, "meeting"))} ahead, ${plural(due, "task")} due today.`;
  else if (meetings > 0) day = `${cap(plural(meetings, "meeting"))} ahead, nothing due.`;
  else day = `Calendar's clear, ${plural(due, "task")} due today.`;

  const wp = weatherPhrase(weather);
  return wp ? `${day} ${cap(wp)}.` : day;
}

const PILLS: { label: string; message: string }[] = [
  { label: "What's on today?",      message: "What's on my calendar and tasks for today?" },
  { label: "Catch me up",           message: "Catch me up on anything I've missed — emails, tasks, updates" },
  { label: "What's due this week?", message: "What do I have due this week?" },
  { label: "How's my day looking?", message: "How's my day looking overall?" },
];

export function DashboardEmpty() {
  const send = useChatStore((s) => s.send);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const displayData = useDisplayData();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    setWeatherLoading(true);
    fetchWeather()
      .then((d) => { setWeather(d); setWeatherLoading(false); })
      .catch(() => setWeatherLoading(false));
  }, []);

  const period = getPeriod();
  const brief = buildBrief(period, displayData, weather);

  return (
    <div className={styles.dashboard}>
      <div className={styles.content}>
        <header className={styles.hero}>
          <h1 className={styles.greeting}>
            {period}, <em className={styles.name}>{NAME}</em>
          </h1>
          <p className={styles.brief}>{brief}</p>
        </header>

        <div className={styles.composerSlot}>
          <InputBar variant="hero" onSend={send} disabled={isStreaming} />
        </div>

        <div className={styles.cardGrid}>
          <CalendarWidget events={displayData.calendar.data?.events} />
          <TaskWidget
            tasks={displayData.tasks.data?.tasks}
            count={displayData.tasks.data?.count}
          />
          <EmailBadge
            count={displayData.email.data?.count}
            messages={displayData.email.data?.messages}
          />
          <UpcomingWidget events={displayData.upcoming.data?.events} />
          <WeatherWidget data={weather} loading={weatherLoading} />
          <div className={styles.clockCard}>
            <ClockWidget />
          </div>
        </div>

        <div className={styles.actions}>
          {PILLS.map(({ label, message }) => (
            <button
              key={label}
              type="button"
              className={styles.pill}
              onClick={() => send(message)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
