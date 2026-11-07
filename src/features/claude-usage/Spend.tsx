import type { UsageSpend } from "@/api/claudeUsage";
import { dollars, percent } from "./format";

function share(part: number, total: number): number | null {
  return total > 0 ? part / total : null;
}

export function Spend({ spend }: { spend: UsageSpend }) {
  const subagents = spend.sources.find((s) => s.source === "subagents")?.usd ?? 0;
  const sazed = spend.sources.filter((s) => s.source.startsWith("sazed")).reduce((n, s) => n + s.usd, 0);
  const tiles = [
    { label: "Spend", value: dollars(spend.total_usd), note: `API list prices of ${spend.prices_as_of}` },
    { label: "Cost per prompt", value: dollars(spend.cost_per_prompt_usd), note: "Claude Code, subagents included" },
    { label: "Subagent share", value: percent(share(subagents, spend.total_usd), 0), note: `${dollars(subagents)} of spend` },
    { label: "Saved by caching", value: dollars(spend.cache_savings_usd), note: `Sazed itself: ${dollars(sazed)}` },
  ];
  return (
    <section aria-label="Spend" className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-surface px-3.5 py-3">
            <span className="text-meta text-muted">{t.label}</span>
            <span className="font-mono text-heading font-medium text-ink tabular-nums">{t.value}</span>
            <span className="text-caption text-muted">{t.note}</span>
          </div>
        ))}
      </div>
      {spend.unpriced.length > 0 && (
        <p className="px-0.5 text-caption text-muted">
          Not priced: {spend.unpriced.map((u) => `${u.model} (${u.calls} calls)`).join(", ")}
        </p>
      )}
    </section>
  );
}
