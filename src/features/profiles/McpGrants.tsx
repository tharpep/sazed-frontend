import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

import { listMcpServers, type McpServer } from "@/api/mcpServers";
import { Button } from "@/components/ui/button";
import { field } from "@/features/projects/fields";
import { cn } from "@/lib/utils";

export interface GrantRow {
  server: string;
  tools: string;
}

const toolList = (tools: string) =>
  tools
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

export function mcpToRows(mcp: Record<string, string[]>): GrantRow[] {
  return Object.entries(mcp).map(([server, tools]) => ({ server, tools: tools.join(", ") }));
}

export function rowsToMcp(rows: GrantRow[]): Record<string, string[]> {
  return Object.fromEntries(rows.map((r) => [r.server, toolList(r.tools)]));
}

export function grantsProblem(rows: GrantRow[]): string | false {
  if (rows.some((r) => !r.server)) return "MCP access: pick a server for every row.";
  if (new Set(rows.map((r) => r.server)).size !== rows.length) return "MCP access: each server can appear once.";
  if (rows.some((r) => toolList(r.tools).length === 0)) return "MCP access: list tool names, or * for all.";
  return false;
}

export function GrantsList({ mcp }: { mcp: Record<string, string[]> }) {
  const entries = Object.entries(mcp);
  return (
    <div className="min-w-0">
      <p className="text-caption text-muted">MCP access</p>
      {entries.length === 0 ? (
        <p className="text-meta text-ink-2">None</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {entries.map(([server, tools]) => (
            <li key={server} className="font-mono text-meta text-ink [overflow-wrap:anywhere]">
              {server} <span className="text-ink-2">{tools.includes("*") ? "all tools" : tools.join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface EditorProps {
  rows: GrantRow[];
  onChange: (rows: GrantRow[]) => void;
}

export function GrantsEditor({ rows, onChange }: EditorProps) {
  const [servers, setServers] = useState<McpServer[] | null>(null);

  useEffect(() => {
    listMcpServers()
      .then(setServers)
      .catch(() => setServers([]));
  }, []);

  const safe = (servers ?? []).filter((s) => s.agent_safe).map((s) => s.name);
  const patch = (i: number, change: Partial<GrantRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...change } : r)));

  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="text-caption text-muted">MCP access</legend>
      <p className="text-caption text-muted">Agents get no MCP servers unless granted here.</p>
      {rows.map((r, i) => (
        <div key={i} className="flex min-w-0 flex-wrap items-start gap-1.5 md:flex-nowrap">
          <select
            value={r.server}
            onChange={(e) => patch(i, { server: e.target.value })}
            aria-label="MCP server"
            className={cn(field, "min-w-0 flex-1 font-mono md:max-w-[12rem]")}
          >
            <option value="">Pick a server</option>
            {[...new Set([...safe, ...(r.server ? [r.server] : [])])].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label="Remove grant"
            className="md:order-last"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            <X aria-hidden="true" />
          </Button>
          <input
            value={r.tools}
            onChange={(e) => patch(i, { tools: e.target.value })}
            aria-label="Tools"
            placeholder="* or tool_a, tool_b"
            className={cn(field, "basis-full font-mono md:min-w-0 md:flex-1 md:basis-0")}
          />
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="self-start"
        disabled={servers !== null && safe.length === 0}
        onClick={() => onChange([...rows, { server: "", tools: "*" }])}
      >
        <Plus aria-hidden="true" />
        Add server
      </Button>
    </fieldset>
  );
}
