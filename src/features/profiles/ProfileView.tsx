import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { errorText } from "@/api/homelab";
import {
  deleteProfile,
  getProfile,
  profileError,
  saveProfile,
  type ProfileDetail,
  type ProfileValues,
} from "@/api/profiles";
import { Button } from "@/components/ui/button";
import { Author, ago } from "@/features/plans/planParts";
import { field } from "@/features/projects/fields";
import { budget, timeout } from "./format";
import { GrantsList } from "./McpGrants";
import { ProfileForm } from "./ProfileForm";

function Facts({ values }: { values: ProfileValues }) {
  const rows: [string, string][] = [
    ["Model", values.model],
    ["Effort", values.effort],
    ["Budget", budget(values.budget_usd)],
    ["Timeout", timeout(values.timeout_s)],
    ["Read-only", values.read_only ? "yes" : "no"],
    ["Evidence required", values.evidence_required ? "yes" : "no"],
  ];
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 md:p-4">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-caption text-muted">{k}</dt>
            <dd className="font-mono text-meta text-ink [overflow-wrap:anywhere]">{v}</dd>
          </div>
        ))}
      </dl>
      {values.description && <p className="text-meta text-ink-2">{values.description}</p>}
      <GrantsList mcp={values.mcp ?? {}} />
    </div>
  );
}

export interface HistoryEntry {
  version: number;
  author: string;
  reason: string;
  at: string;
}

export function History({
  versions,
  shown,
  onView,
}: {
  versions: HistoryEntry[];
  shown: number;
  onView: (version: number) => void;
}) {
  return (
    <aside aria-label="History" className="flex min-w-0 flex-col gap-1.5 lg:sticky lg:top-0 lg:self-start">
      <h2 className="px-0.5 text-meta text-muted">
        History <span className="font-mono text-caption">{versions.length}</span>
      </h2>
      <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {versions.map((v) => (
          <li key={v.version} className={cn(v.version === shown && "shadow-[inset_2px_0_0_var(--color-primary)]")}>
            <button
              type="button"
              onClick={() => onView(v.version)}
              aria-current={v.version === shown}
              className="flex w-full min-w-0 flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-raised/60"
            >
              <span className="flex items-baseline justify-between gap-2 text-caption text-muted">
                <Author name={v.author} />
                <span className="font-mono whitespace-nowrap tabular-nums">
                  v{v.version} · {ago(v.at)}
                </span>
              </span>
              <span className="text-meta text-ink [overflow-wrap:anywhere]">{v.reason}</span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}

interface DeleteBoxProps {
  name: string;
  noun: string;
  consequence: string;
  remove: (reason: string) => Promise<unknown>;
  onDeleted: () => void;
}

export function DeleteBox({ name, noun, consequence, remove, onDeleted }: DeleteBoxProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await remove(reason.trim());
      onDeleted();
    } catch (err) {
      setError(profileError(err));
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="self-start text-err" onClick={() => setOpen(true)}>
        Delete {noun}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-err/40 bg-surface p-3">
      <p className="text-meta text-ink">
        Delete <span className="font-mono">{name}</span>? {consequence}
      </p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        aria-label="Reason for deleting"
        placeholder="Reason for deleting"
        className={field}
      />
      {error && <p className="text-caption text-err">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" variant="destructive" disabled={busy || !reason.trim()} onClick={confirm}>
          Delete
        </Button>
      </div>
    </div>
  );
}

interface Props {
  name: string;
  onBack: () => void;
  onChanged: () => void;
}

export function ProfileView({ name, onBack, onChanged }: Props) {
  const [detail, setDetail] = useState<ProfileDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);

  const load = useCallback(() => {
    setError(null);
    return getProfile(name)
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
      Profiles
    </button>
  );

  if (!detail) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        {error ? <p className="text-meta text-err">Couldn't load the profile: {error}</p> : <p className="text-meta text-muted">Loading…</p>}
      </div>
    );
  }

  const old = viewing !== null && viewing !== detail.version ? detail.history.find((v) => v.version === viewing) : undefined;

  async function save(values: ProfileValues, reason: string) {
    await saveProfile(name, values, reason, detail?.version ?? null);
    await load();
    onChanged();
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {back}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-mono text-title font-semibold text-ink">{detail.name}</h2>
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
              <Facts values={old.profile} />
            </>
          ) : (
            <>
              <ProfileForm
                key={detail.version}
                name={detail.name}
                initial={detail}
                submitLabel="Save"
                onSubmit={save}
                onReload={load}
              />
              <DeleteBox
                name={detail.name}
                noun="profile"
                consequence="Dispatch plans that name it will stop resolving."
                remove={(reason) => deleteProfile(name, reason)}
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
