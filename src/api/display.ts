import { apiFetch } from "./client";

// --- Types (mirror gateway Pydantic models) ---

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  location?: string;
}

export interface CalendarData {
  events: CalendarEvent[];
  count: number;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  due?: string;
  notes?: string;
  list_name: string;
}

export interface TasksData {
  tasks: Task[];
  count: number;
}

export interface EmailMessage {
  id: string;
  subject: string;
  sender: string;
  snippet: string;
  date: string;
}

export interface EmailData {
  messages: EmailMessage[];
  count: number;
}

export interface UpcomingPayment {
  name: string;
  amount: number;
  frequency: string;
  next_billing_date: string;
  category: string;
}

export interface WeatherData {
  temp: number;
  condition: string;
  high: number;
  low: number;
  precip_chance: number;
}

// --- Fetch functions ---

export async function fetchCalendarToday(): Promise<CalendarData> {
  return apiFetch("/calendar/today") as Promise<CalendarData>;
}

export async function fetchTasksDueToday(): Promise<TasksData> {
  const listsRes = (await apiFetch("/tasks/lists")) as {
    lists: { id: string; title: string }[];
    count: number;
  };
  const lists = listsRes.lists ?? [];
  if (lists.length === 0) return { tasks: [], count: 0 };

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayTs = todayEnd.getTime();

  const allTasks: Task[] = [];
  await Promise.all(
    lists.map(async (list) => {
      try {
        const res = (await apiFetch(
          `/tasks/lists/${list.id}/tasks?include_completed=false`
        )) as { tasks: Task[]; count: number };
        allTasks.push(...(res.tasks ?? []));
      } catch {
        // individual list failure — skip
      }
    })
  );

  const due = allTasks.filter((t) => {
    if (!t.due) return false;
    return new Date(t.due).getTime() <= todayTs;
  });

  return { tasks: due, count: due.length };
}

export async function fetchUnreadEmail(): Promise<EmailData> {
  return apiFetch("/email/unread") as Promise<EmailData>;
}

export async function fetchUpcomingPayments(days = 7): Promise<UpcomingPayment[]> {
  return apiFetch(`/finance/upcoming?days=${days}`) as Promise<UpcomingPayment[]>;
}

export async function fetchUpcomingCalendar(): Promise<CalendarData> {
  return apiFetch("/calendar/events?days=7") as Promise<CalendarData>;
}

const WMO_CONDITIONS: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy",
  45: "Foggy", 48: "Freezing fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Showers", 81: "Rain showers", 82: "Heavy showers",
  85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
};

export async function fetchWeather(): Promise<WeatherData | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${latitude}&longitude=${longitude}` +
            `&current=temperature_2m,weather_code` +
            `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
            `&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`;
          const resp = await fetch(url);
          if (!resp.ok) { resolve(null); return; }
          const data = await resp.json();
          resolve({
            temp: Math.round(data.current.temperature_2m as number),
            condition: WMO_CONDITIONS[data.current.weather_code as number] ?? "Unknown",
            high: Math.round(data.daily.temperature_2m_max[0] as number),
            low: Math.round(data.daily.temperature_2m_min[0] as number),
            precip_chance: (data.daily.precipitation_probability_max[0] as number) ?? 0,
          });
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 10_000 }
    );
  });
}
