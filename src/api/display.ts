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
  available: false;
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

export function fetchWeather(): WeatherData {
  // Stub — returns unavailable until Google Weather/Places integration is added
  return { available: false };
}
