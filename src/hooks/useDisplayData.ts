import { useEffect, useState } from "react";
import type { CalendarData, TasksData, EmailData, UpcomingPayment } from "../api/display";
import {
  fetchCalendarToday,
  fetchTasksDueToday,
  fetchUnreadEmail,
  fetchUpcomingPayments,
  fetchUpcomingCalendar,
} from "../api/display";

interface WidgetState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

export interface DisplayData {
  calendar: WidgetState<CalendarData>;
  upcoming: WidgetState<CalendarData>;
  tasks: WidgetState<TasksData>;
  email: WidgetState<EmailData>;
  finance: WidgetState<UpcomingPayment[]>;
}

const INTERVALS = {
  calendar: 5 * 60 * 1000,   // 5 min
  upcoming: 5 * 60 * 1000,   // 5 min
  tasks:    10 * 60 * 1000,  // 10 min
  email:    5 * 60 * 1000,   // 5 min
  finance:  30 * 60 * 1000,  // 30 min
};

function init<T>(): WidgetState<T> {
  return { data: null, loading: true, error: false };
}

export function useDisplayData(): DisplayData {
  const [calendar, setCalendar] = useState<WidgetState<CalendarData>>(init);
  const [upcoming, setUpcoming] = useState<WidgetState<CalendarData>>(init);
  const [tasks, setTasks] = useState<WidgetState<TasksData>>(init);
  const [email, setEmail] = useState<WidgetState<EmailData>>(init);
  const [finance, setFinance] = useState<WidgetState<UpcomingPayment[]>>(init);

  function poll<T>(
    fetcher: () => Promise<T>,
    setter: React.Dispatch<React.SetStateAction<WidgetState<T>>>,
    interval: number
  ): () => void {
    let cancelled = false;
    const load = () => {
      setter((s) => ({ ...s, loading: true, error: false }));
      fetcher()
        .then((data) => {
          if (!cancelled) setter({ data, loading: false, error: false });
        })
        .catch(() => {
          if (!cancelled) setter((s) => ({ ...s, loading: false, error: true }));
        });
    };
    load();
    const id = setInterval(load, interval);
    return () => { cancelled = true; clearInterval(id); };
  }

  useEffect(() => poll(fetchCalendarToday, setCalendar, INTERVALS.calendar), []);
  useEffect(() => poll(fetchUpcomingCalendar, setUpcoming, INTERVALS.upcoming), []);
  useEffect(() => poll(fetchTasksDueToday, setTasks, INTERVALS.tasks), []);
  useEffect(() => poll(fetchUnreadEmail, setEmail, INTERVALS.email), []);
  useEffect(() => poll(fetchUpcomingPayments, setFinance, INTERVALS.finance), []);

  return { calendar, upcoming, tasks, email, finance };
}
