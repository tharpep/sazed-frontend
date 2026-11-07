import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { errorText } from "@/api/homelab";
import { getPlan, listPlanVersions, type Plan, type PlanSection, type PlanVersion } from "@/api/plans";
import type { ProjectCard } from "@/api/projects";
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
            className="rounded-md bg-primary px-2.5 py-1 text-caption font-medium text-white transition-opacity hover:opacity-90"
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
            className={cn("flex items-start gap-1 pl-2", ver.version === shown && "shadow-[inset_2px_0_0_var(--color-primary)]")}
          >
            <input
              type="checkbox"
              checked={checked.includes(ver.version)}
              onChange={() => onToggle(ver.version)}
              aria-label={`Select v${ver.version} to compare`}
              className="mt-3 size-3.5 shrink-0 accent-primary"
            />
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

  const back = (
    <button
      type="button"
      onClick={onBack}
      className="-ml-1 inline-flex items-center gap-1 self-start rounded-md px-1 py-0.5 text-meta text-ink-2 transition-colors hover:bg-raised hover:text-ink"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      Plans
    </button>
  );

  if (!plan) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        {error ? <p className="text-meta text-err">Couldn't load the plan: {error}</p> : <p className="text-meta text-muted">Loading…</p>}
      </div>
    );
  }

  const behind = plan.shown_version < plan.version;

  return (
    <div className="flex flex-col gap-4">
      {back}
      <div className="flex flex-col gap-2">
        <p className="text-caption text-muted">
          {plan.project_title ?? "No project"} / Plans / <span className="text-ink-2">{plan.title}</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 className="text-title font-semibold text-ink">{plan.title}</h2>
          <span className="font-mono text-caption text-muted">v{plan.version}</span>
          <PlanStatePill state={plan.state} />
        </div>
      </div>
      {behind && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-raised px-3 py-2 text-meta text-ink-2">
          <span>
            Viewing v{plan.shown_version} · newest is v{plan.version}
          </span>
          <button type="button" onClick={() => onView(null)} className="text-primary hover:underline">
            Back to v{plan.version}
          </button>
        </div>
      )}
      {error && <p className="text-meta text-err">{error}</p>}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
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
      </div>
    </div>
  );
}
