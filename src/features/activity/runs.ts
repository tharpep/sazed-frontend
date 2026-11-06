import type { ActivityEvent, ActivityStatus } from "@/api/activity";

/** One row on the Activity page: every loaded event that shares a trace, or a lone event. */
export interface Run {
  key: string;
  trace: string | null;
  /** The event that names the run (the automation, job or user message). */
  head: ActivityEvent;
  /** Newest first, like the page's event list. */
  events: ActivityEvent[];
  status: ActivityStatus;
  newestAt: string;
  oldestAt: string;
  durationMs: number | null;
  costUsd: number;
  modelCalls: number;
  toolCalls: number;
  jobs: number;
  notified: boolean;
  /** Sazed's last reply in the run, when it said something. */
  reply: string | null;
}

export interface Step {
  label: string;
  value: string;
  tone?: "err";
}

// Kinds that describe what a run *is*; the newest one names the run.
const isHeadKind = (kind: string) =>
  kind === "automation" || kind.startsWith("job") || kind === "approval" || kind === "backlog";

// A whole chat session can span days; past an hour a duration stops meaning anything.
const MAX_SPAN_MS = 60 * 60 * 1000;
// A Pushover sent by a run lands within seconds of the run's last event.
const NOTIFY_WINDOW_MS = 2 * 60 * 1000;

const groupable = (e: ActivityEvent) => !!e.trace && !e.trace.startsWith("gw:");

/**
 * Groups newest-first events into runs, newest run first. An automation's chat session has its
 * own trace but the run's events name it, so both become one row; a Pushover the run sent (a
 * gateway event with no trace) joins the run whose name it mentions.
 */
export function groupRuns(events: ActivityEvent[]): Run[] {
  const sessionToRun = new Map<string, string>();
  for (const e of events) {
    const session = e.refs.session;
    if (e.trace?.startsWith("run:") && session) sessionToRun.set(`session:${session}`, e.trace);
  }

  const byTrace = new Map<string, ActivityEvent[]>();
  const order: (string | ActivityEvent)[] = [];
  const notifications: ActivityEvent[] = [];
  for (const e of events) {
    if (e.kind === "gw.notify") {
      notifications.push(e);
      continue;
    }
    if (!groupable(e)) {
      order.push(e);
      continue;
    }
    const trace = sessionToRun.get(e.trace!) ?? e.trace!;
    const list = byTrace.get(trace);
    if (list) list.push(e);
    else {
      byTrace.set(trace, [e]);
      order.push(trace);
    }
  }

  // Attach each notification to the run it reports on, or keep it as its own row.
  for (const n of notifications) {
    const at = Date.parse(n.at);
    const owner = [...byTrace.entries()].find(([trace, list]) => {
      if (!trace.startsWith("run:")) return false;
      const name = automationName(list.find((e) => e.kind === "automation")?.title ?? "");
      const last = Math.max(...list.map((e) => Date.parse(e.at)));
      return !!name && n.title.includes(name) && at >= last - 1000 && at - last <= NOTIFY_WINDOW_MS;
    });
    if (owner) {
      owner[1].push(n);
      owner[1].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    } else {
      order.push(n);
    }
  }

  const runs = order.map((o) => (typeof o === "string" ? toRun(o, byTrace.get(o)!) : toRun(null, [o])));
  return runs.sort((a, b) => Date.parse(b.newestAt) - Date.parse(a.newestAt));
}

function toRun(trace: string | null, events: ActivityEvent[]): Run {
  const head = events.find((e) => isHeadKind(e.kind)) ?? events.find((e) => e.kind === "chat.user") ?? events[0];
  const starts = events.map((e) => Date.parse(e.at));
  const ends = events.map((e) => Date.parse(e.at) + (e.duration_ms ?? 0));
  const span = Math.max(...ends) - Math.min(...starts);
  const replyEvent = events.find((e) => e.kind === "chat.reply");
  const reply = replyEvent && replyEvent.title.trim().toUpperCase() !== "NOTHING" ? replyEvent.title : null;

  let status: ActivityStatus = head.status;
  if (events.some((e) => e.status === "error")) status = "error";
  else if (events.some((e) => e.status === "pending")) status = "pending";

  return {
    key: trace ?? `event-${head.id}`,
    trace,
    head,
    events,
    status,
    newestAt: events[0].at,
    oldestAt: events[events.length - 1].at,
    durationMs: head.duration_ms ?? (events.length > 1 && span < MAX_SPAN_MS ? span : null),
    costUsd: events.reduce((sum, e) => sum + (e.cost_usd ?? 0), 0),
    modelCalls: events.filter((e) => e.kind === "llm").length,
    toolCalls: events.filter((e) => e.kind === "tool").length,
    jobs: new Set(events.map((e) => e.refs.job).filter(Boolean)).size,
    notified: events.some((e) => e.kind === "gw.notify"),
    reply,
  };
}

/** "Morning brief: skipped" / "Morning brief started" -> "Morning brief". */
function automationName(title: string): string {
  return title.replace(/: \w+$/, "").replace(/ started$/, "");
}

/** "Research done: Scout: console UX" -> { kind: "Research", word: "done", subject: "Scout: console UX" }. */
function parseJobTitle(title: string): { kind: string; word: string; subject: string } | null {
  const m = /^(.+?) (done|failed|started|queued|cancelled|timed out|waiting for approval|paused)(?::\s*(.*))?$/i.exec(title);
  return m ? { kind: m[1], word: m[2].toLowerCase(), subject: m[3] ?? "" } : null;
}

/** Drops a "Scout: " style prefix from a job subject when the run is already named for it. */
function trimSubject(subject: string, runName: string): string {
  const m = /^([^:]+):\s*(.+)$/.exec(subject);
  return m && runName.toLowerCase().includes(m[1].toLowerCase()) ? m[2] : subject;
}

/** "claude-sonnet-5-5 · chat" -> "Sonnet 5.5 · chat". Leaves anything else alone. */
export function modelLabel(title: string): string {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)(.*)$/.exec(title);
  if (!m) return title;
  return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}.${m[3]}${m[4]}`;
}

/** A model call's step label: the model, plus what it was for unless that was the chat itself. */
function modelStepLabel(title: string): string {
  const [model, purpose] = modelLabel(title).split(" · ");
  return purpose && purpose !== "chat" ? `${model}, ${purpose}` : model;
}

export function duration(value: number | null | undefined): string {
  if (value == null) return "";
  if (value < 1000) return `${value} ms`;
  if (value < 60_000) return `${(value / 1000).toFixed(1)} s`;
  const s = Math.round(value / 1000);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function msRange(values: number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max < 1000) return min === max ? `${min} ms` : `${min}–${max} ms`;
  return min === max ? duration(min) : `${(min / 1000).toFixed(1)}–${(max / 1000).toFixed(1)} s`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What the run did, one line per kind of step, in the order the mock reads: chat models, repeated tools, single tools, other models, jobs, notifications. */
export function runSteps(run: Run): Step[] {
  const oldestFirst = [...run.events].reverse();
  const models = new Map<string, number>();
  const tools = new Map<string, number[]>();
  for (const e of oldestFirst) {
    if (e.kind === "llm") models.set(modelStepLabel(e.title), (models.get(modelStepLabel(e.title)) ?? 0) + 1);
    if (e.kind === "tool") tools.set(e.title, [...(tools.get(e.title) ?? []), e.duration_ms ?? 0]);
  }
  const chatModels = [...models].filter(([label]) => !label.includes(","));
  const otherModels = [...models].filter(([label]) => label.includes(","));
  const repeated = [...tools].filter(([, d]) => d.length > 1);
  const singles = [...tools].filter(([, d]) => d.length === 1).map(([name]) => name);

  const steps: Step[] = [
    ...chatModels.map(([label, n]) => ({ label, value: plural(n, "call") })),
    ...repeated.map(([name, d]) => ({ label: `${name}, ${plural(d.length, "call")}`, value: msRange(d) })),
    ...(singles.length ? [{ label: singles.join(", "), value: plural(singles.length, "call") }] : []),
    ...otherModels.map(([label, n]) => ({ label, value: plural(n, "call") })),
  ];

  // Jobs: one line each, from their latest event.
  const runName = automationName(run.head.title);
  const seen = new Set<string>();
  for (const e of run.events) {
    const job = e.refs.job;
    // A job's own run doesn't list itself as a step.
    if (!job || seen.has(job) || !e.kind.startsWith("job") || job === run.head.refs.job) continue;
    seen.add(job);
    const parsed = parseJobTitle(e.title);
    const subject = parsed ? trimSubject(parsed.subject, runName) : e.title;
    const label = parsed ? (subject ? `${parsed.kind}: ${subject}` : parsed.kind) : e.title;
    const failed = e.status === "error";
    const word = failed ? "Failed" : e.status === "running" ? "Running" : parsed?.word === "done" ? "Done" : (parsed?.word ?? "");
    steps.push({ label, value: word ? word[0].toUpperCase() + word.slice(1) : "", tone: failed ? "err" : undefined });
  }
  if (run.notified) steps.push({ label: "Pushover notification", value: "Sent" });
  return steps;
}

export interface RunText {
  title: string;
  /** Leads the description; shown in red when the run failed. */
  outcome: string | null;
  detail: string;
}

/** The row's title and description, in words rather than event names. */
export function runText(run: Run): RunText {
  const { head } = run;

  if (head.kind === "automation") {
    const name = automationName(head.title);
    const suffix = /: (\w+)$/.exec(head.title)?.[1];
    if (run.status === "running") return { title: name, outcome: "Running", detail: "" };
    if (run.status === "error" || suffix === "error" || suffix === "failed") {
      const failedJob = run.events.find((e) => e.kind.startsWith("job") && e.status === "error");
      const parsed = failedJob ? parseJobTitle(failedJob.title) : null;
      const finished = run.events
        .filter((e) => e.kind.startsWith("job") && e.status === "ok")
        .map((e) => parseJobTitle(e.title))
        .filter((p): p is NonNullable<typeof p> => !!p && p.word === "done")
        .map((p) => `${p.kind} on ${trimSubject(p.subject, name)} finished`);
      const parts = [
        parsed ? `at the ${parsed.kind.toLowerCase()} step.` : "",
        finished.length ? `${finished.join("; ")}${run.notified ? "; notification sent." : "."}` : run.notified ? "Notification sent." : "",
      ].filter(Boolean);
      return { title: name, outcome: "Failed", detail: parts.join(" ") };
    }
    if (suffix === "skipped") {
      return {
        title: name,
        outcome: "Skipped.",
        detail: run.reply ?? (run.notified ? "Notification sent." : "Nothing to report, so no notification."),
      };
    }
    return { title: name, outcome: run.notified ? "Sent." : "Done.", detail: run.reply ?? stepSummary(run) };
  }

  if (head.kind.startsWith("job")) {
    const parsed = parseJobTitle(head.title);
    const title = parsed ? (parsed.subject ? `${parsed.kind}: ${parsed.subject}` : parsed.kind) : head.title;
    const outcome =
      run.status === "error" ? "Failed" : run.status === "running" ? "Running" : run.status === "pending" ? "Waiting for you" : parsed?.word === "done" ? "Done" : null;
    return { title, outcome, detail: stepSummary(run) };
  }

  if (head.kind === "backlog") {
    const m = /^New idea: (.+)$/.exec(head.title);
    return m ? { title: "New backlog idea", outcome: null, detail: m[1] } : { title: head.title, outcome: null, detail: "" };
  }

  if (head.kind === "gw.notify") return { title: head.title, outcome: null, detail: "Pushover notification" };
  if (head.kind === "gw.mcp") return { title: head.title, outcome: null, detail: "Called over MCP" };
  if (head.kind === "llm") return { title: modelLabel(head.title), outcome: null, detail: "" };
  return { title: head.title, outcome: null, detail: run.reply ?? stepSummary(run) };
}

/** "3 model calls · 12 tool calls", for runs with nothing better to say. */
export function stepSummary(run: Run): string {
  const parts = [
    run.modelCalls ? plural(run.modelCalls, "model call") : "",
    run.toolCalls ? plural(run.toolCalls, "tool call") : "",
  ].filter(Boolean);
  return parts.join(" · ");
}
