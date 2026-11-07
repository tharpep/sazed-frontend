import type { UsageOverview } from "@/api/claudeUsage";
import { Card } from "./Card";
import { dollars, modelName, percent, SOURCE_LABEL, tokens } from "./format";

function SmallTable({ title, heads, rows }: { title: string; heads: string[]; rows: string[][] }) {
  return (
    <Card title={title}>
      <div>
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-meta text-muted">None in this range.</p>
        ) : (
          <table className="w-full text-meta">
            <thead>
              <tr className="border-b border-line text-caption text-muted">
                {heads.map((h, i) => (
                  <th key={h} scope="col" className={`px-4 py-2 font-normal ${i ? "text-right" : "w-[30%] text-left"}`}>
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
                      className={i ? "px-4 py-2 text-right font-mono text-ink-2 tabular-nums" : "max-w-0 truncate px-4 py-2 text-ink"}
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
    </Card>
  );
}

export function Tables({ overview }: { overview: UsageOverview }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <SmallTable
        title="Spend by model"
        heads={["Model", "Spend", "Share", "Output", "Cache read"]}
        rows={overview.spend.models.map((m) => [
          modelName(m.model),
          dollars(m.usd),
          percent(m.share),
          tokens(m.output_tokens),
          tokens(m.cache_read_tokens),
        ])}
      />
      <SmallTable
        title="Side calls (not in transcripts)"
        heads={["Call type", "Spend", "Calls", "Output"]}
        rows={overview.spend.side_calls.map((c) => [c.query_source, dollars(c.usd), String(c.calls), tokens(c.output_tokens)])}
      />
      <SmallTable
        title="Spend by source"
        heads={["Source", "Spend", "Calls", "Input", "Cache write"]}
        rows={overview.spend.sources.map((s) => [
          SOURCE_LABEL[s.source] ?? s.source,
          dollars(s.usd),
          String(s.calls),
          tokens(s.input_tokens),
          tokens(s.cache_write_tokens),
        ])}
      />
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
