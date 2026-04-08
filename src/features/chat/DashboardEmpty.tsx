import { useEffect, useState } from "react";
import { CalendarWidget } from "../../widgets/CalendarWidget";
import { UpcomingWidget } from "../../widgets/UpcomingWidget";
import { TaskWidget } from "../../widgets/TaskWidget";
import { EmailBadge } from "../../widgets/EmailBadge";
import { WeatherWidget } from "../../widgets/WeatherWidget";
import { ClockWidget } from "../../widgets/ClockWidget";
import { useDisplayData } from "../../hooks/useDisplayData";
import { fetchWeather } from "../../api/display";
import type { WeatherData } from "../../api/display";
import { useChatStore } from "../../store/chatStore";
import styles from "./DashboardEmpty.module.css";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning, Pryce";
  if (h < 17) return "Afternoon, Pryce";
  return "Evening, Pryce";
}

const PILLS: { label: string; message: string }[] = [
  { label: "What's on today?",      message: "What's on my calendar and tasks for today?" },
  { label: "Catch me up",           message: "Catch me up on anything I've missed — emails, tasks, updates" },
  { label: "What's due this week?", message: "What do I have due this week?" },
  { label: "How's my day looking?", message: "How's my day looking overall?" },
];

export function DashboardEmpty() {
  const send = useChatStore((s) => s.send);
  const displayData = useDisplayData();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    setWeatherLoading(true);
    fetchWeather()
      .then((d) => { setWeather(d); setWeatherLoading(false); })
      .catch(() => setWeatherLoading(false));
  }, []);

  return (
    <div className={styles.dashboard}>
      <div className={styles.content}>
        <div className={styles.greetRow}>
          <span className={styles.greeting}>{getGreeting()}</span>
          {weather && (
            <span className={styles.tempBadge}>{weather.temp}°F</span>
          )}
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
