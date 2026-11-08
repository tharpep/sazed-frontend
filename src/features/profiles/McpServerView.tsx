import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { errorText } from "@/api/homelab";
import { deleteMcpServer, getMcpServer, saveMcpServer, type McpServerDetail, type McpServerValues } from "@/api/mcpServers";
import { Author, ago } from "@/features/plans/planParts";
import { DeleteBox, History } from "./ProfileView";
import { McpServerForm } from "./McpServerForm";

function Facts({ values }: { values: McpServerValues }) {
  const rows: [string, string][] = [
    ["Transport", values.transport],
    values.transport === "http" ? ["URL", values.url ?? ""] : ["Command", [values.command, ...values.args].join(" ")],
    ["Agent-safe", values.agent_safe ? "yes" : "no"],
    ...Object.entries(values.headers).map(([k, v]): [string, string] => [k, v]),
  ];
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 md:p-4">
      <dl className="grid grid-cols-1 gap-x-3 gap-y-2 md:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-caption text-muted">{k}</dt>
            <dd className="font-mono text-meta text-ink [overflow-wrap:anywhere]">{v}</dd>
          </div>
        ))}
      </dl>
      {values.description && <p className="text-meta text-ink-2">{values.description}</p>}
    </div>
  );
}

interface Props {
  name: string;
  onBack: () => void;
  onChanged: () => void;
}

export function McpServerView({ name, onBack, onChanged }: Props) {
  const [detail, setDetail] = useState<McpServerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);

  const load = useCallback(() => {
    setError(null);
    return getMcpServer(name)
      .then((d) => (setDetail(d), setViewing(null)))
      .catch((err) => setError(errorText(err)));
  }, [name]);

  useEffect(() => {
    setDetail(null);
    load();
  }, [load]);

  const back = (
    <button
      type="button"
      onClick={onBack}
      className="-ml-1 inline-flex items-center gap-1 self-start rounded-md px-1 py-0.5 text-meta text-ink-2 transition-colors hover:bg-raised hover:text-ink"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      MCP servers
    </button>
  );

  if (!detail) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        {error ? <p className="text-meta text-err">Couldn't load the server: {error}</p> : <p className="text-meta text-muted">Loading…</p>}
      </div>
    );
  }

  const old = viewing !== null && viewing !== detail.version ? detail.history.find((v) => v.version === viewing) : undefined;

  async function save(values: McpServerValues, reason: string) {
    await saveMcpServer(name, values, reason, detail?.version ?? null);
    await load();
    onChanged();
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {back}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-mono text-title font-semibold text-ink [overflow-wrap:anywhere]">{detail.name}</h2>
        <span className="font-mono text-caption text-muted">v{detail.version}</span>
        <span className="text-caption text-muted">
          <Author name={detail.updated_by} />, {ago(detail.updated_at)}
        </span>
      </div>
      {error && <p className="text-meta text-err">{error}</p>}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {old ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-raised px-3 py-2 text-meta text-ink-2">
                <span>
                  Viewing v{old.version} · newest is v{detail.version}
                </span>
                <button type="button" onClick={() => setViewing(null)} className="text-primary hover:underline">
                  Back to v{detail.version}
                </button>
              </div>
              <Facts values={old.server} />
            </>
          ) : (
            <>
              <McpServerForm
                key={detail.version}
                name={detail.name}
                initial={detail}
                submitLabel="Save"
                onSubmit={save}
                onReload={load}
              />
              <DeleteBox
                name={detail.name}
                noun="server"
                consequence="Profiles that grant it must drop the grant first."
                remove={(reason) => deleteMcpServer(name, reason)}
                onDeleted={() => {
                  onChanged();
                  onBack();
                }}
              />
            </>
          )}
        </div>
        <History versions={detail.history} shown={old ? old.version : detail.version} onView={setViewing} />
      </div>
    </div>
  );
}
