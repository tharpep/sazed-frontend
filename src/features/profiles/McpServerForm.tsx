import { useState } from "react";
import { Plus, X } from "lucide-react";

import { ApiError } from "@/api/client";
import { HEADER_REF_PATTERN, SERVER_NAME_PATTERN, type McpServerValues } from "@/api/mcpServers";
import { profileError } from "@/api/profiles";
import { Button } from "@/components/ui/button";
import { field } from "@/features/projects/fields";
import { cn } from "@/lib/utils";

export const BLANK_SERVER: McpServerValues = {
  transport: "http",
  url: "",
  command: "",
  args: [],
  headers: {},
  agent_safe: false,
  description: "",
};

interface Props {
  initial: McpServerValues;
  name?: string;
  submitLabel: string;
  onSubmit: (values: McpServerValues, reason: string, name: string) => Promise<void>;
  onReload?: () => void;
  onCancel?: () => void;
}

export function McpServerForm({ initial, name: fixedName, submitLabel, onSubmit, onReload, onCancel }: Props) {
  const [name, setName] = useState(fixedName ?? "");
  const [transport, setTransport] = useState(initial.transport);
  const [url, setUrl] = useState(initial.url ?? "");
  const [command, setCommand] = useState(initial.command ?? "");
  const [args, setArgs] = useState(initial.args.join("\n"));
  const [headers, setHeaders] = useState<[string, string][]>(Object.entries(initial.headers));
  const [agentSafe, setAgentSafe] = useState(initial.agent_safe);
  const [description, setDescription] = useState(initial.description);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const keys = headers.map(([k]) => k.trim());
  const problems = [
    !fixedName && !SERVER_NAME_PATTERN.test(name) && "Name: lowercase letters, digits, dashes and underscores, starting with a letter.",
    transport === "http" && !/^https?:\/\/\S+$/.test(url.trim()) && "URL: an http or https address.",
    transport === "stdio" && !command.trim() && "Command is required.",
    headers.some(([k, v]) => !k.trim() || !HEADER_REF_PATTERN.test(v.trim())) &&
      "Headers: a name and a ${VAR} reference for every row, like ${GITHUB_TOKEN}.",
    new Set(keys).size !== keys.length && "Headers: each name can appear once.",
  ].filter(Boolean) as string[];
  const ready = problems.length === 0 && reason.trim().length > 0 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStale(false);
    const http = transport === "http";
    const values: McpServerValues = {
      transport,
      url: http ? url.trim() : null,
      command: http ? null : command.trim(),
      args: http ? [] : args.split("\n").map((a) => a.trim()).filter(Boolean),
      headers: http ? Object.fromEntries(headers.map(([k, v]) => [k.trim(), v.trim()])) : {},
      agent_safe: agentSafe,
      description,
    };
    try {
      await onSubmit(values, reason.trim(), name);
    } catch (err) {
      if (fixedName && err instanceof ApiError && err.status === 409) setStale(true);
      else setError(profileError(err));
    } finally {
      setBusy(false);
    }
  }

  const setRow = (i: number, row: [string, string]) => setHeaders(headers.map((h, j) => (j === i ? row : h)));

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-line bg-surface p-3 md:p-4">
      {!fixedName && (
        <label className="flex flex-col gap-1 text-caption text-muted">
          Name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(field, "font-mono")}
            placeholder="github"
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-caption text-muted">
        Transport
        <select value={transport} onChange={(e) => setTransport(e.target.value as McpServerValues["transport"])} className={field}>
          <option value="http">http</option>
          <option value="stdio">stdio</option>
        </select>
      </label>
      {transport === "http" ? (
        <>
          <label className="flex flex-col gap-1 text-caption text-muted">
            URL
            <input value={url} onChange={(e) => setUrl(e.target.value)} className={cn(field, "font-mono")} placeholder="https://host/mcp" />
          </label>
          <fieldset className="flex min-w-0 flex-col gap-1.5">
            <legend className="text-caption text-muted">Headers</legend>
            <p className="text-caption text-muted">
              Values are {"${VAR}"} references. The secret stays in the environment of the machine running dispatch.
            </p>
            {headers.map(([k, v], i) => (
              <div key={i} className="flex min-w-0 flex-wrap items-start gap-1.5 md:flex-nowrap">
                <input
                  value={k}
                  onChange={(e) => setRow(i, [e.target.value, v])}
                  aria-label="Header name"
                  placeholder="Authorization"
                  className={cn(field, "min-w-0 flex-1 font-mono")}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Remove header"
                  className="md:order-last"
                  onClick={() => setHeaders(headers.filter((_, j) => j !== i))}
                >
                  <X aria-hidden="true" />
                </Button>
                <input
                  value={v}
                  onChange={(e) => setRow(i, [k, e.target.value])}
                  aria-label="Header value"
                  placeholder="${GITHUB_TOKEN}"
                  className={cn(field, "basis-full font-mono md:min-w-0 md:flex-1 md:basis-0")}
                />
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => setHeaders([...headers, ["", ""]])}>
              <Plus aria-hidden="true" />
              Add header
            </Button>
          </fieldset>
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-caption text-muted">
            Command
            <input value={command} onChange={(e) => setCommand(e.target.value)} className={cn(field, "font-mono")} placeholder="npx" />
          </label>
          <label className="flex flex-col gap-1 text-caption text-muted">
            Arguments, one per line
            <textarea
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              rows={3}
              className={cn(field, "font-mono")}
              placeholder={"-y\n@scope/server"}
            />
          </label>
        </>
      )}
      <label className="flex items-center gap-2 text-meta text-ink">
        <input type="checkbox" checked={agentSafe} onChange={(e) => setAgentSafe(e.target.checked)} className="size-3.5 accent-primary" />
        Agent-safe (profiles may be granted this server)
      </label>
      <label className="flex flex-col gap-1 text-caption text-muted">
        Description
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-caption text-muted">
        Reason for this change
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={field} />
      </label>
      {problems.map((p) => (
        <p key={p} className="text-caption text-warn">
          {p}
        </p>
      ))}
      {stale && (
        <p className="text-caption text-err">
          Someone changed this server since you opened it. Reload to see their version, then make your edit again.{" "}
          {onReload && (
            <button type="button" onClick={onReload} className="text-primary hover:underline">
              Reload
            </button>
          )}
        </p>
      )}
      {error && <p className="text-caption text-err">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!ready}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
