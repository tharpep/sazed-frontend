import { useEffect, useState } from "react";

import {
  getUsageHub,
  getUsageOverview,
  listUsageSessions,
  type UsageHub,
  type UsageOverview,
  type UsageSessions,
} from "@/api/claudeUsage";
import { errorText } from "@/api/homelab";
import { EmptyState, Page, PageBody, PageHeader, Segmented } from "@/components/system";
import type { Tab } from "./hub";
import { Overview } from "./Overview";
import { SourceTab } from "./SourceTab";
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

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "claude_code", label: "Claude Code" },
  { value: "worker", label: "Worker jobs" },
  { value: "sazed_api", label: "Sazed API" },
];

type Range = (typeof RANGES)[number]["value"];

function ClaudeCodeTab({ days, machine }: { days: number; machine: string | null }) {
  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [sessions, setSessions] = useState<UsageSessions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const query = { days, machine };
    Promise.all([getUsageOverview(query), listUsageSessions(query)])
      .then(([o, s]) => {
        if (!current) return;
        setOverview(o);
        setSessions(s);
        setError(null);
      })
      .catch((err) => current && setError(errorText(err)));
    return () => {
      current = false;
    };
  }, [days, machine]);

  if (error)
    return (
      <p role="alert" className="text-meta text-err">
        {error}
      </p>
    );
  if (!overview || !sessions) return <p className="text-meta text-muted">Loading…</p>;
  if (overview.tiles.sessions === 0)
    return <EmptyState title="No Claude sessions in this range">Sessions appear here once the pusher has sent them.</EmptyState>;
  return (
    <>
      <Tiles tiles={overview.tiles} limits={overview.limits} />
      <Spend spend={overview.spend} />
      <Timeline sessions={sessions.sessions} limits={sessions.limits} />
      <Trends weekly={overview.weekly} />
      <Tables overview={overview} />
    </>
  );
}

export function ClaudeUsagePage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<Range>("30");
  const [machine, setMachine] = useState<string | null>(null);
  const [hub, setHub] = useState<UsageHub | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    getUsageHub(Number(range))
      .then((h) => {
        if (!current) return;
        setHub(h);
        setError(null);
      })
      .catch((err) => current && setError(errorText(err)));
    return () => {
      current = false;
    };
  }, [range]);

  const machines = [...new Set((hub?.sources ?? []).filter((s) => s.source === "claude_code").map((s) => s.machine))].sort();
  const showMachine = tab === "overview" || tab === "claude_code";

  return (
    <Page>
      <PageHeader title="Usage" />
      <PageBody>
        <Segmented label="Usage view" options={TABS} value={tab} onChange={setTab} className="self-start" />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
          <Segmented
            label="Range"
            options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
            value={range}
            onChange={setRange}
          />
          {showMachine && (
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
          )}
        </div>
        {tab === "claude_code" ? (
          <ClaudeCodeTab days={Number(range)} machine={machine} />
        ) : error ? (
          <p role="alert" className="text-meta text-err">
            {error}
          </p>
        ) : !hub ? (
          <p className="text-meta text-muted">Loading…</p>
        ) : tab === "overview" ? (
          <Overview hub={hub} machine={machine} onOpen={setTab} />
        ) : tab === "worker" ? (
          <SourceTab
            key="worker"
            hub={hub}
            sources={["worker_claude", "worker_agy"]}
            metrics={[
              { value: "api_equivalent", label: "API-equivalent" },
              { value: "tokens", label: "Tokens" },
            ]}
            callsLabel="Jobs"
            empty="No worker jobs in this range"
          />
        ) : (
          <SourceTab
            key="sazed_api"
            hub={hub}
            sources={["sazed_api"]}
            metrics={[
              { value: "billed", label: "Billed" },
              { value: "tokens", label: "Tokens" },
            ]}
            callsLabel="Calls"
            empty="No Sazed API calls in this range"
          />
        )}
      </PageBody>
    </Page>
  );
}
