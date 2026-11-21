import * as z from "zod";

import type { BoardBar, BoardProgress, Project, ProjectCard, Workstream } from "@/api/projects";

// The gateway's board_projects and board_project default to detail="summary", which sends this
// brief instead of the full project. The model reads the same payload, so the card adapts the
// brief rather than the gateway sending more. Bars, step counts and the current step are
// rebuilt with Sazed's own rules; projectBrief.test.ts checks them against full payloads.

const progress = z.object({
  done: z.number(),
  in_flight: z.number(),
  needs_me: z.number(),
  next: z.number(),
  total: z.number(),
});

const status = z.enum(["done", "dropped", "needs_me", "in_flight", "blocked", "next", "planned"]);

const briefCard = z.object({
  id: z.string(),
  title: z.string(),
  stage: z.enum(["inbox", "next", "doing", "needs_me", "done"]),
  rank: z.number().nullable(),
});

const briefStep = z.object({
  id: z.string(),
  title: z.string(),
  position: z.number(),
  status,
  progress,
  cards: z.array(briefCard).optional(),
});

const briefProject = z.object({
  slug: z.string(),
  title: z.string(),
  state: z.enum(["active", "paused", "done", "dropped"]),
  rank: z.number().nullable(),
  headline: z.string(),
  latest_update: z.string().nullable(),
  steps: z.array(briefStep),
});

type BriefStep = z.infer<typeof briefStep>;
type BriefProject = z.infer<typeof briefProject>;

const NO_BAR: BoardBar = { done: 0, in_flight: 0, needs_me: 0, next: 0 };

function stepBar(step: BriefStep): BoardBar {
  if (step.status === "done") return { ...NO_BAR, done: 1 };
  const { total } = step.progress;
  if (!total) return NO_BAR;
  return {
    done: step.progress.done / total,
    in_flight: step.progress.in_flight / total,
    needs_me: step.progress.needs_me / total,
    next: step.progress.next / total,
  };
}

function toCard(card: z.infer<typeof briefCard>, workstreamId: string): ProjectCard {
  return {
    ...card,
    kind: card.id.startsWith("job:") ? "job" : "item",
    source: "",
    next: "",
    updated_at: "",
    repo: null,
    item_type: null,
    effort: null,
    impact: null,
    workstream_id: workstreamId,
    actions: [],
    job_id: null,
    job_status: null,
    ci_state: null,
    fix_count: null,
    pr_number: null,
    pr_url: null,
    pr_draft: null,
    plan_id: null,
    plan_section: null,
    plan_version: null,
  };
}

function toWorkstream(step: BriefStep): Workstream {
  return {
    id: step.id,
    title: step.title,
    summary: "",
    position: step.position,
    state: step.status === "done" || step.status === "dropped" ? step.status : "open",
    status: step.status,
    depends_on: [],
    progress: step.progress,
    bar: stepBar(step),
    cards: step.cards?.map((card) => toCard(card, step.id)),
  };
}

function toProject(brief: BriefProject): Project {
  const workstreams = brief.steps.map(toWorkstream);
  const live = workstreams.filter((w) => w.status !== "dropped");
  const sum = (key: keyof BoardProgress) => workstreams.reduce((n, w) => n + w.progress[key], 0);
  const mean = (key: keyof BoardBar) => (live.length ? live.reduce((n, w) => n + w.bar[key], 0) / live.length : 0);
  const current = live.find((w) => w.status !== "done");
  return {
    id: brief.slug,
    slug: brief.slug,
    title: brief.title,
    summary: "",
    state: brief.state,
    rank: brief.rank,
    repos: [],
    plan: null,
    latest_update: brief.latest_update,
    latest_update_at: null,
    updated_at: "",
    headline: brief.headline,
    progress: { done: sum("done"), in_flight: sum("in_flight"), needs_me: sum("needs_me"), next: sum("next"), total: sum("total") },
    bar: { done: mean("done"), in_flight: mean("in_flight"), needs_me: mean("needs_me"), next: mean("next") },
    steps_done: live.filter((w) => w.status === "done").length,
    steps_total: live.length,
    current: current ? { id: current.id, title: current.title, status: current.status } : null,
    workstreams,
  };
}

export const projectFromBrief = briefProject.transform(toProject);

export const projectsFromBrief = z
  .object({ projects: z.array(briefProject) })
  .transform(({ projects }) => ({ projects: projects.map(toProject) }));
