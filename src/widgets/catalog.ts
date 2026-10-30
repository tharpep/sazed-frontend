import type React from "react";
// Always the namespace import: `import { z } from "zod"` bundles every locale, about 4x the size.
import * as z from "zod";

import type {
  CalendarEvent,
  EmailMessage,
  Task,
  UpcomingPayment,
  WeatherData,
} from "../api/display";
import { CalendarWidget } from "./CalendarWidget";
import { ClockWidget } from "./ClockWidget";
import { EmailBadge } from "./EmailBadge";
import { FinanceWidget } from "./FinanceWidget";
import { GitHubWidget, type GitHubIssue } from "./GitHubWidget";
import { TaskWidget } from "./TaskWidget";
import { UpcomingWidget } from "./UpcomingWidget";
import { WeatherWidget } from "./WeatherWidget";
import { toStrictJsonSchema } from "./strictSchema";

const calendarEvent = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string().describe("ISO 8601 start time"),
  end: z.string().describe("ISO 8601 end time"),
  all_day: z.boolean(),
  location: z.string().nullish(),
});

const task = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  due: z.string().nullish().describe("ISO date"),
  notes: z.string().nullish(),
  list_name: z.string(),
});

const emailMessage = z.object({
  id: z.string(),
  subject: z.string(),
  sender: z.string(),
  snippet: z.string(),
  date: z.string(),
});

const upcomingPayment = z.object({
  name: z.string(),
  amount: z.number(),
  frequency: z.string(),
  next_billing_date: z.string().describe("YYYY-MM-DD"),
  category: z.string(),
});

const weatherData = z.object({
  temp: z.number(),
  condition: z.string(),
  high: z.number(),
  low: z.number(),
  precip_chance: z.number().describe("Percent, 0 to 100"),
});

const gitHubIssue = z.object({
  number: z.int(),
  title: z.string(),
  reason: z.string().optional(),
});

// Compile-time drift check: each schema must match its API type exactly, both ways.
type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
true satisfies Same<z.infer<typeof calendarEvent>, CalendarEvent>;
true satisfies Same<z.infer<typeof task>, Task>;
true satisfies Same<z.infer<typeof emailMessage>, EmailMessage>;
true satisfies Same<z.infer<typeof upcomingPayment>, UpcomingPayment>;
true satisfies Same<z.infer<typeof weatherData>, WeatherData>;
true satisfies Same<z.infer<typeof gitHubIssue>, GitHubIssue>;

export interface WidgetDef {
  // Erased here because the catalog is heterogeneous; widget() has already checked the pair.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  props: z.ZodObject;
  ownership: "locked" | "ambient" | "agent";
  description: string;
  /** Given no props, the component fetches its own data from the gateway and keeps it fresh. */
  live: boolean;
}

/** Ties a component to its schema: it won't compile unless the component accepts the schema's output. */
function widget<S extends z.ZodObject>(
  def: Omit<WidgetDef, "component" | "props"> & {
    component: React.ComponentType<z.output<S>>;
    props: S;
  }
): WidgetDef {
  return def;
}

export const WIDGET_CATALOG = {
  ClockWidget: widget({
    component: ClockWidget,
    props: z.object({}),
    ownership: "locked",
    description: "Live clock, always visible, never delegated to the agent.",
    live: false,
  }),
  CalendarWidget: widget({
    component: CalendarWidget,
    props: z.object({ events: z.array(calendarEvent) }),
    ownership: "ambient",
    description: "Today's calendar events.",
    live: true,
  }),
  UpcomingWidget: widget({
    component: UpcomingWidget,
    props: z.object({ events: z.array(calendarEvent) }),
    ownership: "ambient",
    description: "Calendar events over the coming weeks.",
    live: true,
  }),
  TaskWidget: widget({
    component: TaskWidget,
    props: z.object({ tasks: z.array(task), count: z.int() }),
    ownership: "ambient",
    description: "Tasks due today.",
    live: true,
  }),
  EmailBadge: widget({
    component: EmailBadge,
    props: z.object({ count: z.int(), messages: z.array(emailMessage).optional() }),
    ownership: "ambient",
    description: "Unread email count and previews.",
    live: true,
  }),
  FinanceWidget: widget({
    component: FinanceWidget,
    props: z.object({ upcoming: z.array(upcomingPayment) }),
    ownership: "ambient",
    description: "Upcoming payments.",
    live: true,
  }),
  WeatherWidget: widget({
    component: WeatherWidget,
    props: z.object({ data: weatherData.nullable() }),
    ownership: "ambient",
    description: "Current weather and today's high, low and rain chance.",
    live: false,
  }),
  GitHubWidget: widget({
    component: GitHubWidget,
    props: z.object({ issues: z.array(gitHubIssue) }),
    ownership: "agent",
    description: "Top GitHub issues to work on.",
    live: false,
  }),
} satisfies Record<string, WidgetDef>;

export type WidgetName = keyof typeof WIDGET_CATALOG;

export function getWidget(name: string): WidgetDef | undefined {
  return Object.prototype.hasOwnProperty.call(WIDGET_CATALOG, name) ? WIDGET_CATALOG[name as WidgetName] : undefined;
}

/** Generates a catalog string for injection into the Sazed system prompt. */
export function getWidgetCatalogPrompt(): string {
  const entries = Object.entries(WIDGET_CATALOG)
    .filter(([, def]) => def.ownership !== "locked")
    .map(([name, def]) => `- ${name}: ${def.description} Props: ${JSON.stringify(toStrictJsonSchema(def.props))}`)
    .join("\n");
  return (
    `Available UI widgets you may emit as ui_block SSE events:\n${entries}\n\n` +
    `To emit a widget: event: ui_block\\ndata: {"component":"WidgetName","props":{...}}`
  );
}
