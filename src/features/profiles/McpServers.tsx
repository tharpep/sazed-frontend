import { EmptyState, ListRow, ListSection } from "@/components/system";
import type { McpServer } from "@/api/mcpServers";
import type { Profile } from "@/api/profiles";
import { Author, ago } from "@/features/plans/planParts";

function Tag({ children }: { children: string }) {
  return <span className="rounded border border-line px-1.5 font-mono text-caption text-ink-2">{children}</span>;
}

function Row({ server, grantedTo, onOpen }: { server: McpServer; grantedTo: string[]; onOpen: () => void }) {
  const target = server.transport === "http" ? server.url : [server.command, ...server.args].join(" ");
  return (
    <ListRow
      onClick={onOpen}
      title={<span className="font-mono">{server.name}</span>}
      description={
        <>
          {server.description}
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 font-mono text-caption text-muted [overflow-wrap:anywhere]">
              {server.transport} · {target}
            </span>
            {server.agent_safe && <Tag>agent-safe</Tag>}
          </span>
          <span className="mt-1 block text-caption text-muted">
            {grantedTo.length ? `Granted to ${grantedTo.join(", ")}` : "Not granted to any profile"}
          </span>
        </>
      }
      meta={
        <>
          <span className="font-mono">v{server.version}</span>
          <span>
            <Author name={server.updated_by} />, {ago(server.updated_at)}
          </span>
        </>
      }
    />
  );
}

interface Props {
  servers: McpServer[] | null;
  profiles: Profile[] | null;
  error: string | null;
  onOpen: (name: string) => void;
}

export function McpServers({ servers, profiles, error, onOpen }: Props) {
  return (
    <>
      <p className="text-meta text-ink-2">Servers dispatch can hand to an agent. Profiles decide which ones, and which tools.</p>
      {error && <p className="text-meta text-err">Couldn't load MCP servers: {error}</p>}
      {servers ? (
        servers.length === 0 ? (
          <EmptyState title="No MCP servers yet">Register a server here, then grant it to a profile.</EmptyState>
        ) : (
          <ListSection>
            {servers.map((s) => (
              <Row
                key={s.name}
                server={s}
                grantedTo={(profiles ?? []).filter((p) => s.name in (p.mcp ?? {})).map((p) => p.name)}
                onOpen={() => onOpen(s.name)}
              />
            ))}
          </ListSection>
        )
      ) : (
        !error && <p className="text-meta text-muted">Loading…</p>
      )}
    </>
  );
}
