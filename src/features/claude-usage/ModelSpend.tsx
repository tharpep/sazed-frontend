import { useEffect, useState } from "react";

import { getMetrics, type AuditMetrics } from "@/api/audit";
import { errorText } from "@/api/homelab";
import { modelName, tokens, usd } from "@/features/gateway/format";
import { Card } from "./Card";

// Sazed's /audit/metrics refuses more than 30 days, so the 90-day range reads the last 30.
const MAX_DAYS = 30;

/** Sazed's own model calls by model (Sazed /audit/metrics) over the page's range. */
export function ModelSpend({ days }: { days: number }) {
  const shownDays = Math.min(days, MAX_DAYS);
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    getMetrics(shownDays * 24)
      .then((m) => {
        if (!current) return;
        setMetrics(m);
        setError(null);
      })
      .catch((err) => current && setError(errorText(err)));
    return () => {
      current = false;
    };
  }, [shownDays]);

  const models = metrics
    ? Object.entries(metrics.llm.by_model).sort(([, a], [, b]) => b.cost_usd - a.cost_usd)
    : [];
  const purposes = metrics
    ? Object.entries(metrics.llm.by_purpose).sort(([, a], [, b]) => b.cost_usd - a.cost_usd)
    : [];

  return (
    <Card title="Spend by model" note={`Sazed's model calls, last ${shownDays} days`}>
      {error ? (
        <p role="alert" className="px-4 py-3 text-meta text-err">
          {error}
        </p>
      ) : !metrics ? (
        <p className="px-4 py-3 text-meta text-muted">Loading…</p>
      ) : (
        <>
          <p className="border-b border-line px-4 py-2.5 text-meta text-ink">
            <span className="font-mono">{usd(metrics.llm.total_cost_usd)}</span>
            <span className="text-muted">
              {" "}
              · {metrics.llm.total_calls} model calls · {tokens(metrics.llm.total_input_tokens)} in,{" "}
              {tokens(metrics.llm.total_output_tokens)} out
            </span>
          </p>
          {models.length === 0 ? (
            <p className="px-4 py-3 text-meta text-muted">No model calls in this range.</p>
          ) : (
            <table className="w-full text-meta">
              <thead>
                <tr className="border-b border-line text-left text-caption text-muted">
                  <th className="px-4 py-2 font-medium">Model</th>
                  <th className="px-4 py-2 text-right font-medium">Calls</th>
                  <th className="px-4 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {models.map(([model, u]) => (
                  <tr key={model} className="border-t border-line first:border-t-0">
                    <td className="px-4 py-2 font-sans text-ink">{modelName(model)}</td>
                    <td className="px-4 py-2 text-right">{u.calls.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{usd(u.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {purposes.length > 0 && (
            <p className="border-t border-line px-4 py-2.5 text-caption text-muted">
              By use: {purposes.map(([p, u]) => `${p} ${usd(u.cost_usd)}`).join(" · ")}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
