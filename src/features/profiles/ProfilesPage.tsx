import { useCallback, useEffect, useState } from "react";

import { EmptyState, ListRow, ListSection, Page, PageBody } from "@/components/system";
import { ToolsRow } from "@/components/shell/ToolsRow";
import { errorText } from "@/api/homelab";
import { listMcpServers, saveMcpServer, type McpServer } from "@/api/mcpServers";
import { listProfiles, saveProfile, type Profile } from "@/api/profiles";
import { Author, ago } from "@/features/plans/planParts";
import { useNavStore } from "@/store/navStore";
import { budget, timeout } from "./format";
import { BLANK_SERVER, McpServerForm } from "./McpServerForm";
import { McpServerView } from "./McpServerView";
import { McpServers } from "./McpServers";
import { BLANK, ProfileForm } from "./ProfileForm";
import { ProfileView } from "./ProfileView";

function Tag({ children }: { children: string }) {
  return <span className="rounded border border-line px-1.5 font-mono text-caption text-ink-2">{children}</span>;
}

function Row({ profile, onOpen }: { profile: Profile; onOpen: () => void }) {
  return (
    <ListRow
      onClick={onOpen}
      title={<span className="font-mono">{profile.name}</span>}
      description={
        <>
          {profile.description}
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-caption text-muted">
              {profile.model} · {profile.effort} · {budget(profile.budget_usd)} · {timeout(profile.timeout_s)}
            </span>
            {profile.read_only && <Tag>read-only</Tag>}
            {profile.evidence_required && <Tag>evidence</Tag>}
          </span>
        </>
      }
      meta={
        <>
          <span className="font-mono">v{profile.version}</span>
          <span>
            <Author name={profile.updated_by} />, {ago(profile.updated_at)}
          </span>
        </>
      }
    />
  );
}

function openProfile(name: string) {
  useNavStore.getState().openItem({ kind: "profile", id: name });
}

function openServer(name: string) {
  useNavStore.getState().openItem({ kind: "mcp", id: name });
}

/** The Profiles and MCP servers views; the open profile or server is navStore's, like any item. */
export function ProfilesPage() {
  const inServers = useNavStore((s) => s.view.agents === "mcp");
  const navItem = useNavStore((s) => s.open.agents);
  const [servers, setServers] = useState<McpServer[] | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selectedProfile = navItem?.kind === "profile" ? navItem.id : null;
  const selectedServer = navItem?.kind === "mcp" ? navItem.id : null;
  const open = inServers ? selectedServer : selectedProfile;

  // An item opened from anywhere (a row, a link, the palette) or a switch of view drops the
  // create form.
  useEffect(() => {
    setCreating(false);
  }, [open, inServers]);

  const load = useCallback(
    () =>
      listProfiles()
        .then((p) => (setProfiles(p), setError(null)))
        .catch((err) => setError(errorText(err))),
    []
  );

  const loadServers = useCallback(
    () =>
      listMcpServers()
        .then((s) => (setServers(s), setServerError(null)))
        .catch((err) => setServerError(errorText(err))),
    []
  );

  useEffect(() => {
    load();
    loadServers();
  }, [load, loadServers]);

  return (
    <Page>
      <PageBody>
        <ToolsRow
          action={
            open || creating
              ? undefined
              : { label: inServers ? "New server" : "New profile", onClick: () => setCreating(true) }
          }
        />
        {inServers ? (
          selectedServer ? (
            <McpServerView
              name={selectedServer}
              onBack={() => useNavStore.getState().closeItem("mcp")}
              onChanged={() => (loadServers(), load())}
            />
          ) : (
            <>
              {creating && (
                <McpServerForm
                  initial={BLANK_SERVER}
                  submitLabel="Create server"
                  onCancel={() => setCreating(false)}
                  onSubmit={async (values, reason, newName) => {
                    await saveMcpServer(newName, values, reason, null);
                    setCreating(false);
                    await loadServers();
                    openServer(newName);
                  }}
                />
              )}
              <McpServers servers={servers} profiles={profiles} error={serverError} onOpen={openServer} />
            </>
          )
        ) : selectedProfile ? (
          <ProfileView
            name={selectedProfile}
            onBack={() => useNavStore.getState().closeItem("profile")}
            onChanged={load}
          />
        ) : (
          <>
            <p className="text-meta text-ink-2">
              Dispatch reads these when a plan runs. The cheapest model whose check catches its mistakes.
            </p>
            {creating && (
              <ProfileForm
                initial={BLANK}
                submitLabel="Create profile"
                onCancel={() => setCreating(false)}
                onSubmit={async (values, reason, newName) => {
                  await saveProfile(newName, values, reason, null);
                  setCreating(false);
                  await load();
                  openProfile(newName);
                }}
              />
            )}
            {error && <p className="text-meta text-err">Couldn't load profiles: {error}</p>}
            {profiles ? (
              profiles.length === 0 ? (
                <EmptyState title="No profiles yet">Profiles set the model, effort and limits a dispatched task runs with.</EmptyState>
              ) : (
                <ListSection>
                  {profiles.map((p) => (
                    <Row key={p.name} profile={p} onOpen={() => openProfile(p.name)} />
                  ))}
                </ListSection>
              )
            ) : (
              !error && <p className="text-meta text-muted">Loading…</p>
            )}
          </>
        )}
      </PageBody>
    </Page>
  );
}
