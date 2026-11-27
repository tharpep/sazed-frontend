import { useEffect, useState } from "react";

import { getPlan, listPlans, type PlanSummary } from "@/api/plans";
import type { ProjectCard } from "@/api/projects";
import { cn } from "@/lib/utils";
import { useNavStore } from "@/store/navStore";
import { actorWord, shortWhen, type PlanStep } from "@/widgets/projectWork";

// Cards carry the plan's uuid and the plan routes take its slug, so the list is read once per load.
let plansOnce: Promise<PlanSummary[]> | null = null;

function plans(): Promise<PlanSummary[]> {
  plansOnce ??= listPlans().catch((err) => {
    plansOnce = null;
    throw err;
  });
  return plansOnce;
}

export interface CardPlan {
  slug: string;
  /** The card's section text at the plan's current version, or null when the section is gone. */
  text: string | null;
}

/** The card's plan slug and section text, or null while loading, with no plan, or on failure. */
export function useCardPlan(planId: string | null, section: string | null): CardPlan | null {
  const [found, setFound] = useState<{ key: string; plan: CardPlan } | null>(null);
  const key = `${planId}#${section}`;
  useEffect(() => {
    if (!planId) return;
    let live = true;
    plans()
      .then(async (all) => {
        const slug = all.find((p) => p.id === planId)?.slug;
        if (!slug) return;
        const plan = await getPlan(slug);
        const text = plan.sections.find((s) => s.id === section)?.text ?? null;
        if (live) setFound({ key, plan: { slug, text } });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [planId, section, key]);
  return found?.key === key ? found.plan : null;
}

const SCROLL_WAIT_MS = 3000;

/** Opens the plan in the Plans reader and scrolls to the section once it renders. */
export function openPlanSection(slug: string, section: string | null) {
  useNavStore.getState().openItem({ kind: "plan", id: slug });
  if (!section) return;
  const until = Date.now() + SCROLL_WAIT_MS;
  const seek = () => {
    const el = document.getElementById(`section-${section}`);
    if (el) el.scrollIntoView({ block: "start" });
    else if (Date.now() < until) requestAnimationFrame(seek);
  };
  requestAnimationFrame(seek);
}

type CellState = "done" | "current" | "pending";

interface Cell {
  label: string;
  sub: string;
  state: CellState;
}

const BAR: Record<CellState, string> = {
  done: "bg-ink-2/45",
  current: "bg-warn",
  pending: "bg-line",
};

const who = (mark: { at: string; by: string }) => `by ${actorWord(mark.by)}, ${shortWhen(mark.at)}`;

/** The three cells for a card's plan state (mockup H: h-sheet-plan, h-sheet, h-sheet-live). */
export function stripCells(step: PlanStep, card: Pick<ProjectCard, "plan_approval" | "started">): Cell[] {
  const approval = card.plan_approval ?? null;
  const started = card.started ?? null;
  const first: Cell =
    step === "plan"
      ? { label: "Approve plan", sub: "the design is right", state: "current" }
      : step === "stale"
        ? { label: "Approve plan again", sub: "the plan changed", state: "current" }
        : approval
          ? { label: "Plan approved", sub: who(approval), state: "done" }
          : { label: "Plan approval", sub: "none recorded", state: "pending" };
  const second: Cell =
    step === "ready"
      ? { label: "Ready to start", sub: approval ? shortWhen(approval.at) : "", state: "current" }
      : step === "started"
        ? { label: "Ready to start", sub: approval ? shortWhen(approval.at) : "", state: "done" }
        : { label: "Ready to start", sub: "after approval", state: "pending" };
  const third: Cell = started
    ? { label: "Started", sub: who(started), state: "done" }
    : { label: "Started", sub: "by you or an orchestrator", state: "pending" };
  return [first, second, third];
}

export function PlanStrip({ step, card }: { step: PlanStep; card: Pick<ProjectCard, "plan_approval" | "started"> }) {
  return (
    <ol aria-label="Plan state" className="grid grid-cols-3 gap-1.5">
      {stripCells(step, card).map((cell) => (
        <li key={cell.label} aria-current={cell.state === "current" ? "step" : undefined} className="flex min-w-0 flex-col gap-1">
          <i aria-hidden="true" className={cn("block h-[3px] rounded-full", BAR[cell.state])} />
          <span className={cn("text-meta font-medium", cell.state === "current" ? "text-warn" : cell.state === "done" ? "text-ink" : "text-ink-2")}>
            {cell.label}
          </span>
          <span className="text-caption [overflow-wrap:anywhere] text-muted">{cell.sub}</span>
        </li>
      ))}
    </ol>
  );
}
