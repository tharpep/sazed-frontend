import { useCallback, useEffect, useState } from "react";

import { EmptyState, ListRow, ListSection, Page, PageBody, PageHeader, Segmented } from "@/components/system";
import { errorText } from "@/api/homelab";
import { listMcpServers, saveMcpServer, type McpServer } from "@/api/mcpServers";
import { listProfiles, saveProfile, type Profile } from "@/api/profiles";
import { Button } from "@/components/ui/button";
import { Author, ago } from "@/features/plans/planParts";
import { useShellStore } from "@/nav/shellFlag";
import { useNavStore } from "@/store/navStore";
import { useUiStore } from "@/store/uiStore";
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

type Section = "profiles" | "servers";

export function ProfilesPage() {
  const hubs = useShellStore((s) => s.shell) === "hubs";
  // The section is the nav view: agents:mcp is MCP servers, agents:profiles is Profiles.
  const section = useNavStore((s): Section => (s.hub === "agents" && s.view.agents === "mcp" ? "servers" : "profiles"));
  const navProfile = useNavStore((s) => s.open.agents);
  const [server, setServer] = useState<string | null>(null);
  const [servers, setServers] = useState<McpServer[] | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(() => useUiStore.getState().linkedProfile);
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const linkedProfile = useUiStore((s) => s.linkedProfile);

  // A link can arrive while the page is mounted (the palette's Recent), so react to each one and
  // clear it so it never fires again on a later mount.
  useEffect(() => {
    if (!linkedProfile) return;
    setCreating(false);
    setName(linkedProfile);
    useUiStore.getState().setLinkedProfile(null);
  }, [linkedProfile]);

  function setSection(next: Section) {
    setCreating(false);
    if (hubs) useNavStore.getState().go("agents", next === "servers" ? "mcp" : "profiles");
    else useUiStore.getState().openView({ hub: "agents", view: next === "servers" ? "mcp" : "profiles" });
  }

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

  const inServers = section === "servers";
  const selectedName = hubs && navProfile?.kind === "profile" ? navProfile.id : name;
  const open = inServers ? server : selectedName;

  return (
    <Page>
      <PageHeader
        title="Profiles"
        actions={
          !open &&
          !creating && (
            <Button size="sm" onClick={() => setCreating(true)}>
              {inServers ? "New server" : "New profile"}
            </Button>
          )
        }
      />
      <PageBody>
        {!open && (
          <Segmented
            label="Section"
            className="self-start"
            options={[
              { value: "profiles", label: "Profiles" },
              { value: "servers", label: "MCP servers" },
            ]}
            value={section}
            onChange={setSection}
          />
        )}
        {inServers ? (
          server ? (
            <McpServerView name={server} onBack={() => setServer(null)} onChanged={() => (loadServers(), load())} />
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
                    setServer(newName);
                  }}
                />
              )}
              <McpServers servers={servers} profiles={profiles} error={serverError} onOpen={setServer} />
            </>
          )
        ) : name ? (
          <ProfileView
            name={selectedName!}
            onBack={() => (hubs ? useNavStore.getState().closeItem() : setName(null))}
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
                  setName(newName);
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
                    <Row key={p.name} profile={p} onOpen={() => setName(p.name)} />
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
