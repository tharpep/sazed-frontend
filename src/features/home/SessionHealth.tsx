import type { Project, ProjectCard } from "@/api/projects";
import type { SessionHealth } from "@/api/sessions";
import { cn } from "@/lib/utils";
import { dayTime } from "@/widgets/projectWork";

import { openProject } from "./homeNav";
import { listSome, staleSessions, staleSince, staleSteps } from "./sessions";
import { clockOf } from "./shipped";

function when(iso: string, now = new Date()): string {
  return new Date(iso).toDateString() === now.toDateString() ? clockOf(iso) : dayTime(iso);
}

/** Home's one line when nothing runs and nothing waits (mockup h-phone-quiet). */
export function QuietLine({ health }: { health: SessionHealth }) {
  return (
    <p className="rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-meta text-ink-2">
      Nothing running and nothing waits on you.{" "}
      {health.last_heard_at ? `Last heard from a session ${when(health.last_heard_at)}.` : "No session has reported yet."}
    </p>
  );
}

const STEP_BUTTON =
  "inline-flex items-center rounded-md underline decoration-warn/50 underline-offset-2 hover:decoration-warn max-sm:min-h-11";

/** Cards that say "being built" with no session reporting for them. Each step named opens, where
 * the cards can be cleared by hand; there is no bulk clear. */
export function StaleBanner({
  health,
  cards,
  projects,
}: {
  health: SessionHealth;
  cards: readonly ProjectCard[] | null;
  projects: readonly Project[] | null;
}) {
  const n = health.stale_card_ids.length;
  if (n === 0) return null;
  const steps = staleSteps(health.stale_card_ids, cards, projects);
  const sessions = staleSessions(health.stale_card_ids, cards);
  const since = staleSince(health.stale_card_ids, cards);
  const shown = steps.slice(0, 3);
  return (
    <section
      aria-label="Stale cards"
      className="rounded-[10px] border border-dashed border-warn/80 px-3.5 py-2.5 text-meta [overflow-wrap:anywhere] text-ink-2"
    >
      <p className="font-medium text-warn">
        {n} {n === 1 ? "card says" : "cards say"} &ldquo;being built&rdquo; but no session has reported
        {since ? ` since ${dayTime(since)}.` : " for them."}
      </p>
      {shown.length > 0 && (
        <p className="flex flex-col items-start">
          {shown.map((s) => (
            <button
              key={`${s.slug}:${s.step}`}
              type="button"
              onClick={() => openProject(s.slug)}
              className={cn(STEP_BUTTON, "text-left text-ink")}
            >
              {s.project} · {s.step}
              {s.count > 1 && <span className="ml-1 text-muted">({s.count})</span>}
            </button>
          ))}
          {steps.length > shown.length && <span className="text-muted">and {steps.length - shown.length} more steps</span>}
        </p>
      )}
      {sessions.length > 0 && <p>Sessions: {listSome(sessions)}.</p>}
      <p className="text-muted">Open {steps.length === 1 ? "the step" : "a step"} to clear them.</p>
    </section>
  );
}
