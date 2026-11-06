import type { UsageOverview } from "@/api/claudeUsage";
import { modelName, percent } from "./format";

function SmallTable({ title, heads, rows }: { title: string; heads: string[]; rows: string[][] }) {
  return (
    <section className="flex min-w-0 flex-col gap-1.5">
      <h2 className="px-0.5 text-meta text-muted">{title}</h2>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {rows.length === 0 ? (
          <p className="px-3.5 py-3 text-meta text-muted">None in this range.</p>
        ) : (
          <table className="w-full text-meta">
            <thead>
              <tr className="border-b border-line text-caption text-muted">
                {heads.map((h, i) => (
                  <th key={h} scope="col" className={`px-3.5 py-1.5 font-normal ${i ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r[0]}>
                  {r.map((cell, i) => (
                    <td
                      key={i}
                      className={i ? "px-3.5 py-1.5 text-right font-mono text-ink-2 tabular-nums" : "max-w-0 truncate px-3.5 py-1.5 text-ink"}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export function Tables({ overview }: { overview: UsageOverview }) {
  return (
    <div className="grid grid-cols-1 gap-x-2.5 gap-y-4 md:grid-cols-2">
      <SmallTable
        title="Models"
        heads={["Model", "Responses", "Share"]}
        rows={overview.models.map((m) => [modelName(m.model), String(m.responses), percent(m.share)])}
      />
      <SmallTable title="Skills" heads={["Skill", "Uses"]} rows={overview.skills.map((s) => [s.name, String(s.count)])} />
      <SmallTable title="Subagents" heads={["Type", "Runs"]} rows={overview.subagents.map((s) => [s.type, String(s.count)])} />
      <SmallTable
        title="Slash commands"
        heads={["Command", "Uses"]}
        rows={overview.slash_commands.map((s) => [s.command, String(s.count)])}
      />
      <SmallTable
        title="Output styles"
        heads={["Style", "Prompts", "Confusion"]}
        rows={overview.styles.map((s) => [s.style, String(s.prompts), percent(s.confusion_rate)])}
      />
    </div>
  );
}
