import { useState } from "react";

import {
  BUDGET_RANGE,
  EFFORTS,
  MODEL_ALIASES,
  MODEL_PATTERN,
  NAME_PATTERN,
  TIMEOUT_RANGE,
  profileError,
  type ProfileValues,
} from "@/api/profiles";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { field } from "@/features/projects/fields";

export const BLANK: ProfileValues = {
  model: "sonnet",
  effort: "medium",
  budget_usd: 2,
  timeout_s: 1800,
  read_only: false,
  evidence_required: false,
  description: "",
};

interface Props {
  initial: ProfileValues;
  name?: string;
  submitLabel: string;
  onSubmit: (values: ProfileValues, reason: string, name: string) => Promise<void>;
  onReload?: () => void;
  onCancel?: () => void;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-meta text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-3.5 accent-primary" />
      {label}
    </label>
  );
}

export function ProfileForm({ initial, name: fixedName, submitLabel, onSubmit, onReload, onCancel }: Props) {
  const [name, setName] = useState(fixedName ?? "");
  const [values, setValues] = useState(initial);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  const problems = [
    !fixedName && !NAME_PATTERN.test(name) && "Name: lowercase letters, digits and dashes, 2 to 31 characters, starting with a letter.",
    !MODEL_PATTERN.test(values.model) && "Model: haiku, sonnet, opus, fable or a claude-... id.",
    !(values.budget_usd >= BUDGET_RANGE[0] && values.budget_usd <= BUDGET_RANGE[1]) &&
      `Budget: ${BUDGET_RANGE[0]} to ${BUDGET_RANGE[1]} dollars.`,
    !(values.timeout_s >= TIMEOUT_RANGE[0] && values.timeout_s <= TIMEOUT_RANGE[1]) &&
      `Timeout: ${TIMEOUT_RANGE[0]} to ${TIMEOUT_RANGE[1]} seconds.`,
  ].filter(Boolean) as string[];
  const ready = problems.length === 0 && reason.trim().length > 0 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStale(false);
    try {
      await onSubmit(values, reason.trim(), name);
    } catch (err) {
      if (fixedName && err instanceof ApiError && err.status === 409) setStale(true);
      else setError(profileError(err));
    } finally {
      setBusy(false);
    }
  }

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
            placeholder="reviewer"
          />
        </label>
      )}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <label className="flex min-w-0 flex-col gap-1 text-caption text-muted">
          Model
          <input
            list="profile-models"
            value={values.model}
            onChange={(e) => set("model", e.target.value)}
            className={cn(field, "font-mono")}
          />
          <datalist id="profile-models">
            {MODEL_ALIASES.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-caption text-muted">
          Effort
          <select value={values.effort} onChange={(e) => set("effort", e.target.value)} className={field}>
            {EFFORTS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-caption text-muted">
          Budget (USD)
          <input
            type="number"
            inputMode="decimal"
            step="0.05"
            value={values.budget_usd}
            onChange={(e) => set("budget_usd", Number(e.target.value))}
            className={field}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-caption text-muted">
          Timeout (seconds)
          <input
            type="number"
            inputMode="numeric"
            step="60"
            value={values.timeout_s}
            onChange={(e) => set("timeout_s", Number(e.target.value))}
            className={field}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        <Check label="Read-only" checked={values.read_only} onChange={(v) => set("read_only", v)} />
        <Check label="Evidence required" checked={values.evidence_required} onChange={(v) => set("evidence_required", v)} />
      </div>
      <label className="flex flex-col gap-1 text-caption text-muted">
        Description
        <input value={values.description} onChange={(e) => set("description", e.target.value)} className={field} />
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
          Someone changed this profile since you opened it. Reload to see their version, then make your edit again.{" "}
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
