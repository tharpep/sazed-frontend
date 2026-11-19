import { useState } from "react";

import {
  BUDGET_RANGE,
  CAPABILITIES,
  EFFORTS,
  ENGINES,
  MODEL_ALIASES,
  MODEL_PATTERN,
  NAME_PATTERN,
  TIMEOUT_RANGE,
  TOOL_CALLS_RANGE,
  profileError,
  profileValues,
  type Capability,
  type Engine,
  type ProfileValues,
} from "@/api/profiles";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { field } from "@/features/projects/fields";
import { TOUCH } from "./format";
import { GrantsEditor, grantsProblem, mcpToRows, rowsToMcp, type GrantRow } from "./McpGrants";

export const BLANK: ProfileValues = {
  engine: "claude",
  capability: "change",
  model: "sonnet",
  effort: "medium",
  budget_usd: 2,
  timeout_s: 1800,
  max_tool_calls: null,
  evidence_required: false,
  description: "",
  mcp: {},
};

const control = cn(field, "max-sm:min-h-11");

const MODEL_HINT: Record<Engine, string> = {
  claude: "Model: haiku, sonnet, opus, fable or a claude-... id for engine claude.",
  agy: "Model: a gemini-... id for engine agy.",
};

const optionalNumber = (raw: string) => (raw === "" ? null : Number(raw));
const within = (n: number, [lo, hi]: readonly [number, number]) => n >= lo && n <= hi;

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
    <label className="flex items-center gap-2 text-meta text-ink max-sm:min-h-11">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-3.5 accent-primary" />
      {label}
    </label>
  );
}

export function ProfileForm({ initial, name: fixedName, submitLabel, onSubmit, onReload, onCancel }: Props) {
  const [name, setName] = useState(fixedName ?? "");
  const [values, setValues] = useState(() => profileValues(initial));
  const [rows, setRows] = useState<GrantRow[]>(() => mcpToRows(initial.mcp ?? {}));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  const problems = [
    !fixedName &&
      !NAME_PATTERN.test(name) &&
      "Name: lowercase letters, digits, dashes and underscores, 2 to 31 characters, starting with a letter.",
    !MODEL_PATTERN[values.engine].test(values.model) && MODEL_HINT[values.engine],
    values.budget_usd !== null &&
      !within(values.budget_usd, BUDGET_RANGE) &&
      `Budget: ${BUDGET_RANGE[0]} to ${BUDGET_RANGE[1]} dollars, or empty for no cap.`,
    !within(values.timeout_s, TIMEOUT_RANGE) && `Timeout: ${TIMEOUT_RANGE[0]} to ${TIMEOUT_RANGE[1]} seconds.`,
    values.max_tool_calls !== null &&
      !(Number.isInteger(values.max_tool_calls) && within(values.max_tool_calls, TOOL_CALLS_RANGE)) &&
      `Max tool calls: a whole number from ${TOOL_CALLS_RANGE[0]} to ${TOOL_CALLS_RANGE[1]}, or empty for no cap.`,
    grantsProblem(rows),
  ].filter(Boolean) as string[];
  const ready = problems.length === 0 && reason.trim().length > 0 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStale(false);
    try {
      await onSubmit({ ...values, mcp: rowsToMcp(rows) }, reason.trim(), name);
    } catch (err) {
      setError(profileError(err));
      setStale(Boolean(fixedName) && err instanceof ApiError && err.status === 409);
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
            className={cn(control, "font-mono")}
            placeholder="reviewer"
          />
        </label>
      )}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <label className="flex min-w-0 flex-col gap-1 text-caption text-muted">
          Engine
          <select value={values.engine} onChange={(e) => set("engine", e.target.value as Engine)} className={control}>
            {ENGINES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-caption text-muted">
          Capability
          <select
            value={values.capability}
            onChange={(e) => set("capability", e.target.value as Capability)}
            className={control}
          >
            {CAPABILITIES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-caption text-muted">
          Model
          <input
            list="profile-models"
            value={values.model}
            onChange={(e) => set("model", e.target.value)}
            className={cn(control, "font-mono")}
          />
          <datalist id="profile-models">
            {MODEL_ALIASES[values.engine].map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-caption text-muted">
          Effort
          <select value={values.effort ?? ""} onChange={(e) => set("effort", e.target.value || null)} className={control}>
            <option value="">none</option>
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
            value={values.budget_usd ?? ""}
            placeholder="no cap"
            onChange={(e) => set("budget_usd", optionalNumber(e.target.value))}
            className={control}
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
            className={control}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-caption text-muted">
          Max tool calls
          <input
            type="number"
            inputMode="numeric"
            step="1"
            value={values.max_tool_calls ?? ""}
            placeholder="no cap"
            onChange={(e) => set("max_tool_calls", optionalNumber(e.target.value))}
            className={control}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        <Check label="Evidence required" checked={values.evidence_required} onChange={(v) => set("evidence_required", v)} />
      </div>
      <label className="flex flex-col gap-1 text-caption text-muted">
        Description
        <input value={values.description} onChange={(e) => set("description", e.target.value)} className={control} />
      </label>
      <GrantsEditor rows={rows} onChange={setRows} />
      <label className="flex flex-col gap-1 text-caption text-muted">
        Reason for this change
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={control} />
      </label>
      {problems.map((p) => (
        <p key={p} className="text-caption text-warn">
          {p}
        </p>
      ))}
      {error && (
        <p className="text-caption text-err">
          {error}
          {stale && onReload && (
            <>
              {" "}
              <button type="button" onClick={onReload} className="text-primary hover:underline">
                Reload
              </button>
            </>
          )}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" className={TOUCH} onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" className={TOUCH} disabled={!ready}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
