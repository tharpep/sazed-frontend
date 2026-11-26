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
import type { CardPr, NeedsYouItem, NeedsYouView, PullRequestView } from "../api/command";
import type { Project } from "../api/projects";
import { CalendarWidget } from "./CalendarWidget";
import { ClockWidget } from "./ClockWidget";
import { ConfirmCard } from "./ConfirmCard";
import { ContainerWidget } from "./ContainerWidget";
import { EmailBadge } from "./EmailBadge";
import { FinanceWidget } from "./FinanceWidget";
import { GitHubWidget, type GitHubIssue } from "./GitHubWidget";
import { HomelabWidget } from "./HomelabWidget";
import { InfoCard } from "./InfoCard";
import { JobWidget } from "./JobWidget";
import { JobsWidget } from "./JobsWidget";
import { NeedsYouWidget } from "./NeedsYouWidget";
import { PullRequestWidget } from "./PullRequestWidget";
import { ProjectsWidget } from "./ProjectsWidget";
import { ProjectWidget } from "./ProjectWidget";
import { projectFromBrief } from "./projectBrief";
import { StorageWidget } from "./StorageWidget";
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
  due_date: z.string().describe("YYYY-MM-DD"),
  category: z.string(),
});

const weatherData = z.object({
  temp: z.number(),
  condition: z.string(),
  high: z.number(),
  low: z.number(),
  precip_chance: z.number().describe("Percent, 0 to 100"),
});

const homelabService = z.object({
  id: z.string(),
  name: z.string(),
  up: z.boolean().nullish(),
  in_maintenance: z.boolean().nullish(),
});

const tone = z.enum(["normal", "attention", "problem"]);

const gitHubIssue = z.object({
  number: z.int(),
  title: z.string(),
  reason: z.string().optional(),
});

const boardBar = z.object({
  done: z.number(),
  in_flight: z.number(),
  needs_me: z.number(),
  next: z.number(),
});

const boardProgress = z.object({
  done: z.number(),
  in_flight: z.number(),
  needs_me: z.number(),
  next: z.number(),
  total: z.number(),
});

const workstreamStatus = z.enum(["done", "dropped", "needs_me", "in_flight", "blocked", "next", "planned"]);

const projectCard = z.object({
  id: z.string(),
  kind: z.enum(["item", "job"]),
  source: z.string(),
  title: z.string(),
  stage: z.enum(["inbox", "next", "doing", "needs_me", "done"]),
  next: z.string(),
  updated_at: z.string(),
  done_at: z.string().nullable().optional(),
  session_link: z
    .object({
      session: z.string(),
      branch: z.string().nullable(),
      pr_repo: z.string().nullable(),
      pr_number: z.number().nullable(),
      session_id: z.string().nullable().optional(),
      last_heard_at: z.string().nullable().optional(),
      doing: z.string().nullable().optional(),
      session_status: z.string().nullable().optional().describe("running, idle, ended or not_heard_from"),
    })
    .nullable()
    .optional(),
  pr: z
    .object({
      repo: z.string(),
      number: z.number(),
      url: z.string(),
      // Plain strings, not enums: a state word from a newer Sazed must not fail the whole card.
      state: z.string().describe("open, draft, merged or closed"),
      checks: z
        .object({
          state: z.string().describe("passing, failing, running or none"),
          passed: z.number(),
          total: z.number(),
          runs: z.array(z.object({ name: z.string(), conclusion: z.string().nullable() })),
        })
        .nullable(),
      review: z
        .object({
          verdict: z.string().describe("approve, approve_with_nits or request_changes"),
          source: z.string().nullable(),
          url: z.string(),
        })
        .nullable(),
      additions: z.number().nullable(),
      deletions: z.number().nullable(),
      merged_at: z.string().nullable(),
      fetched_at: z.string().nullable(),
    })
    .nullable()
    .optional()
    .describe("Sazed's last snapshot of the card's PR; absent from older payloads"),
  repo: z.string().nullable(),
  item_type: z.string().nullable(),
  effort: z.string().nullable(),
  impact: z.string().nullable(),
  rank: z.number().nullable(),
  workstream_id: z.string().nullable(),
  actions: z.array(z.unknown()),
  job_id: z.string().nullable(),
  job_status: z.string().nullable(),
  ci_state: z.string().nullable(),
  fix_count: z.number().nullable(),
  pr_number: z.number().nullable(),
  pr_url: z.string().nullable(),
  pr_draft: z.boolean().nullable(),
  plan_id: z.string().nullable(),
  plan_section: z.string().nullable(),
  plan_version: z.number().nullable(),
});

const workstream = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  position: z.number(),
  state: z.enum(["open", "done", "dropped"]),
  status: workstreamStatus,
  depends_on: z.array(z.string()),
  progress: boardProgress,
  bar: boardBar,
  cards: z.array(projectCard).optional().describe("Present when one project is fetched, absent in the list"),
});

const project = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  state: z.enum(["active", "paused", "done", "dropped"]),
  rank: z.number().nullable(),
  repos: z.array(z.string()),
  plan: z.string().nullable(),
  latest_update: z.string().nullable(),
  latest_update_at: z.string().nullable(),
  updated_at: z.string(),
  headline: z.string().describe("Plain line for when latest_update is null"),
  progress: boardProgress,
  bar: boardBar,
  steps_done: z.number(),
  steps_total: z.number(),
  current: z.object({ id: z.string(), title: z.string(), status: workstreamStatus }).nullable(),
  workstreams: z.array(workstream),
  dispatch_runs: z
    .array(
      z.object({
        plan: z.string(),
        updated_at: z.string(),
        tasks_total: z.number(),
        states: z.record(z.string(), z.number()),
        phases: z.record(z.string(), z.number()).optional(),
      })
    )
    .optional(),
});

// The two new cards take stage and kind as plain strings and every PR detail as optional, so one
// new server word or a missing key draws as text instead of a fallback.
const needsYouItem = z.object({
  id: z.string(),
  kind: z.string().describe("item, job or dispatch"),
  title: z.string(),
  repo: z.string().nullable(),
  next: z.string(),
  question: z.string().nullable(),
  stage: z.string().nullish(),
  task: z.string().nullish().describe("A dispatch item's task"),
  job_id: z.string().nullish(),
  job_status: z.string().nullish(),
  updated_at: z.string().nullish(),
  pr: z
    .object({
      repo: z.string(),
      number: z.number(),
      url: z.string(),
      state: z.string(),
      checks: z.object({ state: z.string(), passed: z.number(), total: z.number() }).nullish(),
      review: z.object({ verdict: z.string() }).nullish(),
      additions: z.number().nullish(),
      deletions: z.number().nullish(),
    })
    .nullish(),
});

const needsYouView = z.object({
  needs: z.array(needsYouItem).describe("Needs-me cards and dispatch questions, trimmed to what the card draws"),
  needs_total: z.number().nullish().describe("How many needs there are when the list was cut"),
  working: z.array(z.object({ kind: z.string().describe("job or dispatch"), title: z.string(), elapsed_s: z.number() })),
  done: z.object({ succeeded: z.number(), failed: z.number(), window_hours: z.number().nullish() }),
  session_count: z.number().nullish().describe("Live Claude Code sessions"),
  open_url: z.string().nullish().describe("Console Home, https, in a ?page= or ?open= shape"),
});

const prSnapshot = projectCard.shape.pr.unwrap().unwrap();
const cardPr = prSnapshot.extend({
  checks: prSnapshot.shape.checks.optional(),
  review: prSnapshot.shape.review.optional(),
  additions: z.number().nullish(),
  deletions: z.number().nullish(),
  merged_at: z.string().nullish(),
  fetched_at: z.string().nullish(),
});

const pullRequestView = projectCard
  .pick({ id: true, title: true, next: true, repo: true, job_id: true, job_status: true })
  .extend({
    stage: z.string().describe("inbox, next, doing, needs_me or done"),
    pr: cardPr.nullish().describe("Sazed's last snapshot of the card's PR; absent on most cards"),
    open_url: z.string().nullish().describe("The card in the console, https, as ?open=backlog:<id>"),
  });

// Compile-time drift check: each schema must match its API type exactly, both ways.
type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
true satisfies Same<z.infer<typeof calendarEvent>, CalendarEvent>;
true satisfies Same<z.infer<typeof task>, Task>;
true satisfies Same<z.infer<typeof emailMessage>, EmailMessage>;
true satisfies Same<z.infer<typeof upcomingPayment>, UpcomingPayment>;
true satisfies Same<z.infer<typeof weatherData>, WeatherData>;
true satisfies Same<z.infer<typeof gitHubIssue>, GitHubIssue>;
true satisfies Same<z.infer<typeof project>, Project>;
true satisfies Same<z.infer<typeof needsYouItem>, NeedsYouItem>;
true satisfies Same<z.infer<typeof needsYouView>, NeedsYouView>;
true satisfies Same<z.infer<typeof cardPr>, CardPr>;
true satisfies Same<z.infer<typeof pullRequestView>, PullRequestView>;

export interface WidgetDef {
  // Erased here because the catalog is heterogeneous; widget() has already checked the pair.
  component: React.ComponentType<any>;
  props: z.ZodType;
  ownership: "locked" | "ambient" | "agent" | "system";
  description: string;
  describe: (props: never) => string;
  /** Given no props, the component fetches its own data from the gateway and keeps it fresh. */
  live: boolean;
}

/** Ties a component to its schema: it won't compile unless the component accepts the schema's output. */
function widget<S extends z.ZodType>(
  def: Omit<WidgetDef, "component" | "props" | "describe"> & {
    component: React.ComponentType<z.output<S>>;
    props: S;
    describe: (props: z.output<S>) => string;
  }
): WidgetDef {
  return def;
}

export const WIDGET_CATALOG = {
  ClockWidget: widget({
    component: ClockWidget,
    props: z.object({}),
    describe: () => "Clock",
    ownership: "locked",
    description: "Live clock, always visible, never delegated to the agent.",
    live: false,
  }),
  CalendarWidget: widget({
    component: CalendarWidget,
    props: z.object({ events: z.array(calendarEvent) }),
    describe: (p) => `Calendar: ${p.events.length} events today${p.events[0] ? `, first ${p.events[0].title}` : ""}`,
    ownership: "ambient",
    description: "Today's calendar events.",
    live: true,
  }),
  UpcomingWidget: widget({
    component: UpcomingWidget,
    props: z.object({ events: z.array(calendarEvent) }),
    describe: (p) => `Upcoming: ${p.events.length} events${p.events[0] ? `, first ${p.events[0].title}` : ""}`,
    ownership: "ambient",
    description: "Calendar events over the coming weeks.",
    live: true,
  }),
  TaskWidget: widget({
    component: TaskWidget,
    props: z.object({ tasks: z.array(task), count: z.int() }),
    describe: (p) => `Tasks: ${p.count} due${p.tasks[0] ? `, first ${p.tasks[0].title}` : ""}`,
    ownership: "ambient",
    description: "Tasks due today.",
    live: true,
  }),
  EmailBadge: widget({
    component: EmailBadge,
    props: z.object({ count: z.int(), messages: z.array(emailMessage).optional() }),
    describe: (p) => `Mail: ${p.count} unread`,
    ownership: "ambient",
    description: "Unread email count and previews.",
    live: true,
  }),
  FinanceWidget: widget({
    component: FinanceWidget,
    props: z.object({ upcoming: z.array(upcomingPayment) }),
    describe: (p) => `Payments: ${p.upcoming.length} upcoming${p.upcoming[0] ? `, first ${p.upcoming[0].name}` : ""}`,
    ownership: "ambient",
    description: "Upcoming payments.",
    live: true,
  }),
  WeatherWidget: widget({
    component: WeatherWidget,
    props: z.object({ data: weatherData.nullable() }),
    describe: (p) => (p.data ? `Weather: ${p.data.temp}° ${p.data.condition}, high ${p.data.high}, low ${p.data.low}` : "Weather: unavailable"),
    ownership: "ambient",
    description: "Current weather and today's high, low and rain chance.",
    live: false,
  }),
  HomelabWidget: widget({
    component: HomelabWidget,
    props: z.object({
      summary: z.object({ up: z.int(), down: z.int(), unknown: z.int() }),
      services: z.array(homelabService),
    }),
    describe: (p) => `Homelab: ${p.summary.up} up, ${p.summary.down} down${p.services.filter((s) => s.up === false).map((s) => ` ${s.name}`).join(",")}`,
    ownership: "agent",
    description: "How many homelab services are up, and which are down.",
    live: false,
  }),
  JobWidget: widget({
    component: JobWidget,
    props: z.object({
      status: z.string(),
      kind: z.string(),
      title: z.string().nullish(),
      pr_url: z.string().nullish(),
      ci_state: z.string().nullish(),
      question: z.string().nullish(),
      error: z.string().nullish(),
    }),
    describe: (p) => `Job: ${p.title ?? p.kind}, ${p.status}`,
    ownership: "agent",
    description: "One worker job: its status, and any question, error or pull request.",
    live: false,
  }),
  JobsWidget: widget({
    component: JobsWidget,
    props: z.object({
      jobs: z.array(
        z.object({ job_id: z.string(), status: z.string(), title: z.string().nullish() })
      ),
    }),
    describe: (p) => `Jobs: ${p.jobs.length}${p.jobs[0] ? `, latest ${p.jobs[0].title ?? p.jobs[0].job_id} ${p.jobs[0].status}` : ""}`,
    ownership: "agent",
    description: "Recent worker jobs and their status.",
    live: false,
  }),
  StorageWidget: widget({
    component: StorageWidget,
    props: z.object({
      pools: z.array(
        z.object({ name: z.string(), total_bytes: z.number(), free_bytes: z.number() })
      ),
      media: z.object({
        free_bytes: z.number().nullish(),
        downloads: z.object({ not_imported: z.object({ count: z.int() }) }).nullish(),
      }),
    }),
    describe: (p) => `Storage: ${p.pools.length} pools, ${p.media.downloads?.not_imported.count ?? 0} stuck downloads`,
    ownership: "agent",
    description: "Free space for media and per storage pool, and stuck downloads.",
    live: false,
  }),
  ContainerWidget: widget({
    component: ContainerWidget,
    props: z.object({
      vmid: z.int(),
      name: z.string(),
      status: z.string(),
      cpu_percent: z.number().nullish(),
      mem_used_bytes: z.number().nullish(),
      mem_total_bytes: z.number().nullish(),
      disk_used_bytes: z.number().nullish(),
      disk_total_bytes: z.number().nullish(),
    }),
    describe: (p) => `Container ${p.name}: ${p.status}`,
    ownership: "agent",
    description: "One homelab container: status, CPU, memory and disk.",
    live: false,
  }),
  InfoCard: widget({
    component: InfoCard,
    props: z.object({
      title: z.string(),
      subtitle: z.string().nullish(),
      stats: z
        .array(z.object({ label: z.string(), value: z.string(), tone: tone.nullish() }))
        .max(4)
        .nullish()
        .describe("Up to 4 headline numbers"),
      rows: z
        .array(z.object({ label: z.string(), value: z.string().nullish(), tone: tone.nullish() }))
        .max(6)
        .nullish()
        .describe("Up to 6 rows"),
      note: z.string().nullish(),
    }),
    describe: (p) => [p.title, ...(p.stats ?? []).map((x) => `${x.label} ${x.value}`)].join(", "),
    ownership: "agent",
    description: "A short general summary: a title, a few numbers and a few rows.",
    live: false,
  }),
  GitHubWidget: widget({
    component: GitHubWidget,
    props: z.object({ issues: z.array(gitHubIssue) }),
    describe: (p) => `GitHub: ${p.issues.length} issues${p.issues[0] ? `, top #${p.issues[0].number} ${p.issues[0].title}` : ""}`,
    ownership: "agent",
    description: "Top GitHub issues to work on.",
    live: false,
  }),
  ConfirmCard: widget({
    component: ConfirmCard,
    props: z.object({
      tool: z.string(),
      title: z.string(),
      details: z.array(z.object({ label: z.string(), value: z.string() })),
      expires_at: z.string().nullish(),
    }),
    describe: (p) => `Waiting for yes or no: ${p.title}`,
    ownership: "system",
    description: "Asks the user to approve a sensitive tool call; the backend emits it, never the model.",
    live: false,
  }),
  ProjectsWidget: widget({
    component: ProjectsWidget,
    props: z.object({ projects: z.array(z.union([project, projectFromBrief])) }),
    describe: (p) => `Projects: ${p.projects.length}${p.projects[0] ? `, first ${p.projects[0].title}` : ""}`,
    ownership: "agent",
    description: "Every project as a row: a plain sentence, a progress bar, and its workstreams when opened.",
    live: false,
  }),
  ProjectWidget: widget({
    component: ProjectWidget,
    props: z.union([project, projectFromBrief]),
    describe: (p) => `Project ${p.title}: ${p.headline}`,
    ownership: "agent",
    description: "One project as an ordered ladder of workstreams with their cards, then what is in flight, needs the user, and is next.",
    live: false,
  }),
  NeedsYouWidget: widget({
    component: NeedsYouWidget,
    props: needsYouView,
    describe: (p) => `Needs you: ${p.needs_total ?? p.needs.length}${p.needs[0] ? `, first ${p.needs[0].title}` : ""}`,
    ownership: "agent",
    description: "What waits on the user: the first question in full, merge calls with checks and size, and what is running.",
    live: false,
  }),
  PullRequestWidget: widget({
    component: PullRequestWidget,
    props: pullRequestView,
    describe: (p) => (p.pr ? `PR ${p.pr.repo}#${p.pr.number}: ${p.pr.state}` : `Card ${p.title}: no PR`),
    ownership: "agent",
    description: "One board card's pull request: the merge verdict, its checks, size and review; the card itself when it has no PR.",
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
    .filter(([, def]) => def.ownership !== "locked" && def.ownership !== "system")
    .map(([name, def]) => `- ${name}: ${def.description} Props: ${JSON.stringify(toStrictJsonSchema(def.props))}`)
    .join("\n");
  return (
    `Available UI widgets you may emit as ui_block SSE events:\n${entries}\n\n` +
    `To emit a widget: event: ui_block\\ndata: {"component":"WidgetName","props":{...}}`
  );
}

export function describeWidget(name: string, props: Record<string, unknown>): string {
  const entry = getWidget(name);
  if (!entry) return name;
  const parsed = entry.props.safeParse(props);
  return parsed.success ? entry.describe(parsed.data as never) : name;
}
