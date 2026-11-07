import { useEffect, useState } from "react";

import { listUsageSessions, getUsageOverview, type UsageOverview, type UsageSessions } from "@/api/claudeUsage";
import { errorText } from "@/api/homelab";
import { Page, PageBody, PageHeader, Segmented, EmptyState } from "@/components/system";
import { Spend } from "./Spend";
import { Tables } from "./Tables";
import { Tiles } from "./Tiles";
import { Timeline } from "./Timeline";
import { Trends } from "./Trends";

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
] as const;

type Range = (typeof RANGES)[number]["value"];

export function ClaudeUsagePage() {
  const [range, setRange] = useState<Range>("30");
  const [machine, setMachine] = useState<string | null>(null);
  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [sessions, setSessions] = useState<UsageSessions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [machines, setMachines] = useState<string[]>([]);

  useEffect(() => {
    let current = true;
    const query = { days: Number(range), machine };
    Promise.all([getUsageOverview(query), listUsageSessions(query)])
      .then(([o, s]) => {
        if (!current) return;
        setOverview(o);
        setSessions(s);
        setMachines((prev) => (prev.length ? prev : o.machines));
        setError(null);
      })
      .catch((err) => current && setError(errorText(err)));
    return () => {
      current = false;
    };
  }, [range, machine]);

  const filters = (
    <>
      <Segmented
        label="Range"
        options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
        value={range}
        onChange={setRange}
      />
      <select
        aria-label="Machine"
        value={machine ?? ""}
        onChange={(e) => setMachine(e.target.value || null)}
        className="h-8 rounded-md border border-line bg-surface px-2 text-meta text-ink outline-none focus-visible:border-primary"
      >
        <option value="">All machines</option>
        {machines.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </>
  );

  return (
    <Page>
      <PageHeader title="Claude usage" />
      <PageBody>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
          {filters}
        </div>
        {error && (
          <p role="alert" className="text-meta text-err">
            {error}
          </p>
        )}
        {!overview || !sessions ? (
          !error && <p className="text-meta text-muted">Loading…</p>
        ) : overview.tiles.sessions === 0 ? (
          <EmptyState title="No Claude sessions in this range">Sessions appear here once the pusher has sent them.</EmptyState>
        ) : (
          <>
            <Tiles tiles={overview.tiles} limits={overview.limits} />
            <Spend spend={overview.spend} />
            <Timeline sessions={sessions.sessions} limits={sessions.limits} />
            <Trends weekly={overview.weekly} />
            <Tables overview={overview} />
          </>
        )}
      </PageBody>
    </Page>
  );
}
