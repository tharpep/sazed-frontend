import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { errorText } from "@/api/homelab";
import { getPlan, listPlanVersions, type Plan, type PlanSection, type PlanVersion } from "@/api/plans";
import type { ProjectCard } from "@/api/projects";
import { Reader } from "@/components/shell/Reader";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Author, PlanMarkdown, PlanStatePill, STAGE_DOT, ago, stripId } from "./planParts";

function CardRow({ card, changed }: { card: ProjectCard; changed?: boolean }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-md border border-line bg-bg px-2.5 py-1.5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 text-meta">
        <span className={cn("size-1.5 rounded-full", STAGE_DOT[card.stage])} aria-hidden="true" />
        <span className="min-w-0 text-ink [overflow-wrap:anywhere]">{card.title}</span>
        {card.pr_url && (
          <a href={card.pr_url} target="_blank" rel="noreferrer" className="text-caption text-primary hover:underline">
            {card.pr_number ? `PR #${card.pr_number}` : "PR"}
          </a>
        )}
      </div>
      {card.next && <span className="pl-3.5 text-caption text-muted">{card.next}</span>}
      {changed && (
        <span className="pl-3.5 text-caption text-warn">
          Filed from v{card.plan_version}; this section changed since.
        </span>
      )}
    </li>
  );
}

function Section({ section }: { section: PlanSection }) {
  const Heading = section.level <= 2 ? "h3" : "h4";
  return (
    <section id={`section-${section.id}`} className="flex flex-col gap-2">
      <Heading
        className={cn(
          "flex items-baseline gap-2 font-semibold text-ink",
          section.level <= 2 ? "text-title" : "text-body"
        )}
      >
        {stripId(section.title)}
        <span className="font-mono text-caption font-normal text-muted">#{section.id}</span>
      </Heading>
      {section.text && <PlanMarkdown>{section.text}</PlanMarkdown>}
      {section.cards.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {section.cards.map((c) => (
            <CardRow key={c.id} card={c} changed={c.section_changed_since_filed} />
          ))}
        </ul>
      )}
    </section>
  );
}

function HistoryRail({
  versions,
  shown,
  checked,
  onToggle,
  onView,
  onCompare,
}: {
  versions: PlanVersion[];
  shown: number;
  checked: number[];
  onToggle: (version: number) => void;
  onView: (version: number) => void;
  onCompare: () => void;
}) {
  return (
    <aside aria-label="History" className="flex flex-col gap-1.5 lg:sticky lg:top-0 lg:self-start">
      <div className="flex min-h-7 items-center justify-between gap-2 px-0.5">
        <h2 className="text-meta text-muted">
          History <span className="font-mono text-caption">{versions.length}</span>
        </h2>
        {checked.length === 2 ? (
          <button
            type="button"
            onClick={onCompare}
            className="min-h-11 rounded-md bg-primary px-3.5 text-caption font-medium text-white transition-opacity hover:opacity-90 sm:min-h-7 sm:px-2.5"
          >
            Compare
          </button>
        ) : (
          <span className="text-caption text-muted">Select two to compare</span>
        )}
      </div>
      <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {versions.map((ver) => (
          <li
            key={ver.version}
            className={cn("flex items-start", ver.version === shown && "shadow-[inset_2px_0_0_var(--color-primary)]")}
          >
            <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center sm:h-10 sm:w-7 sm:justify-end">
              <input
                type="checkbox"
                checked={checked.includes(ver.version)}
                onChange={() => onToggle(ver.version)}
                aria-label={`Select v${ver.version} to compare`}
                className="size-4 accent-primary sm:size-3.5"
              />
            </label>
            <button
              type="button"
              onClick={() => onView(ver.version)}
              aria-current={ver.version === shown}
              className="flex min-w-0 flex-1 flex-col gap-0.5 px-2 py-2.5 text-left transition-colors hover:bg-raised/60"
            >
              <span className="flex items-baseline justify-between gap-2 text-caption text-muted">
                <Author name={ver.author} />
                <span className="font-mono whitespace-nowrap tabular-nums">
                  v{ver.version} · {ago(ver.created_at)}
                </span>
              </span>
              <span className="text-meta text-ink [overflow-wrap:anywhere]">{ver.reason}</span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}

interface PlanViewProps {
  slug: string;
  version: number | null;
  onBack: () => void;
  onView: (version: number | null) => void;
  onCompare: (a: number, b: number) => void;
}

export function PlanView({ slug, version, onBack, onView, onCompare }: PlanViewProps) {
  const isMobile = useIsMobile();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [checked, setChecked] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setPlan(null);
    getPlan(slug, version)
      .then((p) => live && (setPlan(p), setError(null)))
      .catch((err) => live && setError(errorText(err)));
    return () => {
      live = false;
    };
  }, [slug, version]);

  useEffect(() => {
    let live = true;
    listPlanVersions(slug)
      .then((vs) => live && setVersions(vs))
      .catch((err) => live && setError(errorText(err)));
    return () => {
      live = false;
    };
  }, [slug]);

  function toggle(v: number) {
    setChecked((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  }

  if (!plan) {
    return (
      <Reader back="Plans" context="Work › Plans" onBack={onBack}>
        {error ? (
          <p className="text-meta text-err">Couldn't load the plan: {error}</p>
        ) : (
          <p className="text-meta text-muted">Loading…</p>
        )}
      </Reader>
    );
  }

  const behind = plan.shown_version < plan.version;

  const history = (
    <HistoryRail
      versions={versions}
      shown={plan.shown_version}
      checked={checked}
      onToggle={toggle}
      onView={(v) => onView(v === plan.version ? null : v)}
      onCompare={() => {
        const [a, b] = [...checked].sort((x, y) => x - y);
        onCompare(a, b);
      }}
    />
  );

  const reader = (
    <Reader back="Plans" context={`${plan.project_title ?? "Work"} › Plans`} onBack={onBack}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-title font-semibold text-ink">{plan.title}</h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted">
            <span>{plan.project_title ?? "No project"}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">v{plan.version}</span>
            <PlanStatePill state={plan.state} />
          </p>
        </div>
        {behind && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-raised px-3 py-2 text-meta text-ink-2">
            <span>
              Viewing v{plan.shown_version} · newest is v{plan.version}
            </span>
            <button
              type="button"
              onClick={() => onView(null)}
              className="inline-flex min-h-11 items-center text-primary hover:underline sm:min-h-0"
            >
              Back to v{plan.version}
            </button>
          </div>
        )}
        {error && <p className="text-meta text-err">{error}</p>}
        <article className="flex min-w-0 flex-col gap-5 rounded-lg border border-line bg-surface p-4 md:p-5">
          {plan.preamble && <PlanMarkdown>{plan.preamble}</PlanMarkdown>}
          {plan.sections.map((s) => (
            <Section key={s.id} section={s} />
          ))}
          {plan.unlinked_cards.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-meta text-muted">Cards not tied to a section</h3>
              <ul className="flex flex-col gap-1.5">
                {plan.unlinked_cards.map((c) => (
                  <CardRow key={c.id} card={c} />
                ))}
              </ul>
            </section>
          )}
        </article>
        {isMobile && history}
      </div>
    </Reader>
  );

  if (isMobile) return reader;
  // The reader holds the article to its 68ch measure, so the history sits beside it, not inside.
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <div className="min-w-0 lg:flex-1">{reader}</div>
      <div className="lg:w-[17rem] lg:shrink-0">{history}</div>
    </div>
  );
}
