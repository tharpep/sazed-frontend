import { apiFetch } from "./client";
import type { ProjectCard } from "./projects";

export type PlanState = "draft" | "active" | "done" | "superseded";

export interface PlanSummary {
  id: string;
  slug: string;
  title: string;
  state: PlanState;
  project: string | null;
  project_title: string | null;
  workstream_id: string | null;
  version: number;
  last_author: string | null;
  last_reason: string | null;
  last_saved_at: string | null;
  cards_total: number;
  cards_done: number;
  cards_moved_since: number;
  stale: boolean;
}

export interface PlanSectionCard extends ProjectCard {
  section_changed_since_filed: boolean;
}

export interface PlanSection {
  id: string;
  title: string;
  level: number;
  text: string;
  cards: PlanSectionCard[];
}

export interface Plan extends PlanSummary {
  shown_version: number;
  body: string;
  preamble: string;
  sections: PlanSection[];
  unlinked_cards: ProjectCard[];
}

export interface PlanVersion {
  version: number;
  author: string;
  reason: string;
  created_at: string;
  chars: number;
}

export type DiffSegment = { op: "same" | "add" | "del"; text: string };

export type DiffBlock =
  | { kind: "same"; count: number; headings: string[] }
  | { kind: "add" | "del"; text: string }
  | { kind: "chg"; segments: DiffSegment[] };

export interface PlanDiff {
  from: PlanVersion;
  to: PlanVersion;
  blocks: DiffBlock[];
}

// The endpoints are not deployed yet, so a dev build falls back to fixtures when the fetch fails.
async function withFixture<T>(real: () => Promise<T>, fixture: () => Promise<T | null>): Promise<T> {
  try {
    return await real();
  } catch (err) {
    const fallback = import.meta.env.DEV ? await fixture() : null;
    if (!fallback) throw err;
    return fallback;
  }
}

const mock = () => import("@/mock/plans");

export function listPlans(filter: { project?: string; state?: PlanState } = {}): Promise<PlanSummary[]> {
  const query = new URLSearchParams();
  if (filter.project) query.set("project", filter.project);
  if (filter.state) query.set("state", filter.state);
  const qs = query.toString();
  return withFixture(
    async () => ((await apiFetch(`/board/plans${qs ? `?${qs}` : ""}`)) as { plans: PlanSummary[] }).plans,
    async () => (await mock()).mockPlans(filter)
  );
}

export function getPlan(slug: string, version?: number | null): Promise<Plan> {
  const qs = version ? `?version=${version}` : "";
  return withFixture(
    async () => (await apiFetch(`/board/plans/${encodeURIComponent(slug)}${qs}`)) as Plan,
    async () => (await mock()).mockPlan(slug, version ?? null)
  );
}

export function listPlanVersions(slug: string): Promise<PlanVersion[]> {
  return withFixture(
    async () =>
      ((await apiFetch(`/board/plans/${encodeURIComponent(slug)}/versions`)) as { versions: PlanVersion[] })
        .versions,
    async () => (await mock()).mockVersions(slug)
  );
}

export function getPlanDiff(slug: string, a: number, b: number): Promise<PlanDiff> {
  return withFixture(
    async () => (await apiFetch(`/board/plans/${encodeURIComponent(slug)}/diff?a=${a}&b=${b}`)) as PlanDiff,
    async () => (await mock()).mockDiff(slug, a, b)
  );
}
