import type { Tone } from "@/components/system";

export function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export function percent(rate: number | null, digits = 1): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(digits)}%`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function projectName(path: string | null): string {
  return path?.split("/").filter(Boolean).pop() ?? "unknown";
}

export function sessionLabel(title: string | null, project: string | null): string {
  return title ?? projectName(project);
}

export function modelName(model: string): string {
  return model.replace(/^claude-/, "");
}

export function contextTone(value: number, soft: number, hard: number): Tone {
  if (value > hard) return "err";
  if (value > soft) return "warn";
  return "ok";
}

export function weekLabel(week: string): string {
  return week.slice(week.indexOf("-") + 1);
}

export function niceMax(value: number): number {
  const step = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  return Math.ceil(value / step) * step;
}
