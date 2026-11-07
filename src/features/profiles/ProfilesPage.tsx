import { useCallback, useEffect, useState } from "react";

import { EmptyState, ListRow, ListSection, Page, PageBody, PageHeader } from "@/components/system";
import { errorText } from "@/api/homelab";
import { listProfiles, saveProfile, type Profile } from "@/api/profiles";
import { Button } from "@/components/ui/button";
import { Author, ago } from "@/features/plans/planParts";
import { useUiStore } from "@/store/uiStore";
import { budget, timeout } from "./format";
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

export function ProfilesPage() {
  const [name, setName] = useState<string | null>(() => useUiStore.getState().linkedProfile);
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    useUiStore.getState().setLinkedProfile(null);
  }, []);

  const load = useCallback(
    () =>
      listProfiles()
        .then((p) => (setProfiles(p), setError(null)))
        .catch((err) => setError(errorText(err))),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Page>
      <PageHeader
        title="Profiles"
        actions={
          !name &&
          !creating && (
            <Button size="sm" onClick={() => setCreating(true)}>
              New profile
            </Button>
          )
        }
      />
      <PageBody>
        {name ? (
          <ProfileView name={name} onBack={() => setName(null)} onChanged={load} />
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
