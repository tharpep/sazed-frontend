import type React from "react";
import { ClockWidget } from "./ClockWidget";
import { CalendarWidget } from "./CalendarWidget";
import { TaskWidget } from "./TaskWidget";
import { EmailBadge } from "./EmailBadge";
import { FinanceWidget } from "./FinanceWidget";
import { WeatherWidget } from "./WeatherWidget";
import { GitHubWidget } from "./GitHubWidget";

export type WidgetName =
  | "ClockWidget"
  | "CalendarWidget"
  | "TaskWidget"
  | "EmailBadge"
  | "FinanceWidget"
  | "WeatherWidget"
  | "GitHubWidget";

export interface WidgetMeta {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  ownership: "locked" | "ambient" | "agent";
  description: string;
  propsSchema: string;
}

export const WIDGET_REGISTRY: Record<WidgetName, WidgetMeta> = {
  ClockWidget: {
    component: ClockWidget,
    ownership: "locked",
    description: "Live clock — always visible, never delegated to the agent.",
    propsSchema: "{}",
  },
  CalendarWidget: {
    component: CalendarWidget,
    ownership: "ambient",
    description:
      "Today's calendar events. Props: { events: Array<{ id, title, start, end, all_day, location? }> }.",
    propsSchema:
      '{"events":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"start":{"type":"string"},"end":{"type":"string"},"all_day":{"type":"boolean"},"location":{"type":"string"}}}}}',
  },
  TaskWidget: {
    component: TaskWidget,
    ownership: "ambient",
    description:
      "Tasks due today. Props: { tasks: Array<{ id, title, due?, list_name }>, count: number }.",
    propsSchema:
      '{"tasks":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"due":{"type":"string"},"list_name":{"type":"string"}}}},"count":{"type":"number"}}',
  },
  EmailBadge: {
    component: EmailBadge,
    ownership: "ambient",
    description:
      "Unread email count and previews. Props: { count: number, messages?: Array<{ id, subject, sender, snippet }> }.",
    propsSchema:
      '{"count":{"type":"number"},"messages":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"subject":{"type":"string"},"sender":{"type":"string"},"snippet":{"type":"string"}}}}}',
  },
  FinanceWidget: {
    component: FinanceWidget,
    ownership: "ambient",
    description:
      "Upcoming payments. Props: { upcoming: Array<{ name, amount, frequency, next_billing_date, category }> }.",
    propsSchema:
      '{"upcoming":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"amount":{"type":"number"},"frequency":{"type":"string"},"next_billing_date":{"type":"string"},"category":{"type":"string"}}}}}',
  },
  WeatherWidget: {
    component: WeatherWidget,
    ownership: "ambient",
    description:
      "Current weather stub. Props: { temp?: number, condition?: string, location?: string }. Returns placeholder until Google Weather is integrated.",
    propsSchema:
      '{"temp":{"type":"number"},"condition":{"type":"string"},"location":{"type":"string"}}',
  },
  GitHubWidget: {
    component: GitHubWidget,
    ownership: "agent",
    description:
      "Top GitHub issues to work on. Props: { issues: Array<{ number, title, reason? }> }.",
    propsSchema:
      '{"issues":{"type":"array","items":{"type":"object","properties":{"number":{"type":"number"},"title":{"type":"string"},"reason":{"type":"string"}}}}}',
  },
};

/** Generates a catalog string for injection into the Sazed system prompt. */
export function getWidgetCatalogPrompt(): string {
  const entries = Object.entries(WIDGET_REGISTRY)
    .filter(([, meta]) => meta.ownership !== "locked")
    .map(([name, meta]) => `- ${name}: ${meta.description}`)
    .join("\n");
  return (
    `Available UI widgets you may emit as ui_block SSE events:\n${entries}\n\n` +
    `To emit a widget: event: ui_block\\ndata: {"component":"WidgetName","props":{...}}`
  );
}
