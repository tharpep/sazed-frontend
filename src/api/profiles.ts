import { apiFetch } from "./client";
import { errorText } from "./homelab";

export const ENGINES = ["claude", "agy"] as const;
export const CAPABILITIES = ["research", "review", "change", "browse"] as const;
export type Engine = (typeof ENGINES)[number];
export type Capability = (typeof CAPABILITIES)[number];

export interface ProfileValues {
  engine: Engine;
  capability: Capability;
  model: string;
  /** null sends no effort flag. */
  effort: string | null;
  /** null is no cap. */
  budget_usd: number | null;
  timeout_s: number;
  max_tool_calls: number | null;
  evidence_required: boolean;
  description: string;
  mcp: Record<string, string[]>;
}

const VALUE_KEYS = [
  "engine",
  "capability",
  "model",
  "effort",
  "budget_usd",
  "timeout_s",
  "max_tool_calls",
  "evidence_required",
  "description",
  "mcp",
] as const satisfies readonly (keyof ProfileValues)[];

export interface Profile extends ProfileValues {
  name: string;
  /** Sazed derives it from capability; a save never sends it. */
  read_only: boolean;
  updated_by: string;
  updated_at: string;
  version: number;
}

/** A saved version as it was written: versions from before migration 035 lack the new fields. */
export type StoredProfile = Partial<ProfileValues> & { read_only?: boolean };

export interface ProfileVersion {
  version: number;
  author: string;
  reason: string;
  at: string;
  profile: StoredProfile;
}

export interface ProfileDetail extends Profile {
  history: ProfileVersion[];
}

export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export const MODEL_ALIASES: Record<Engine, readonly string[]> = {
  claude: ["haiku", "sonnet", "opus", "fable"],
  agy: [],
};
export const NAME_PATTERN = /^[a-z][a-z0-9_-]{1,30}$/;
export const MODEL_PATTERN: Record<Engine, RegExp> = {
  claude: /^(haiku|sonnet|opus|fable|claude-[\w.\-[\]]+)$/,
  agy: /^gemini-[\w.-]+$/,
};
export const BUDGET_RANGE = [0.05, 50] as const;
export const TIMEOUT_RANGE = [60, 7200] as const;
export const TOOL_CALLS_RANGE = [1, 1000] as const;

export function profileValues(p: ProfileValues): ProfileValues {
  return Object.fromEntries(VALUE_KEYS.map((k) => [k, p[k]])) as unknown as ProfileValues;
}

const AUTHOR = "pryce";
const path = (name: string) => `/agents/profiles/${encodeURIComponent(name)}`;

export function listProfiles(): Promise<Profile[]> {
  return apiFetch("/agents/profiles") as Promise<Profile[]>;
}

export function getProfile(name: string): Promise<ProfileDetail> {
  return apiFetch(path(name)) as Promise<ProfileDetail>;
}

export function saveProfile(
  name: string,
  values: ProfileValues,
  reason: string,
  expectedVersion: number | null
): Promise<Profile> {
  return apiFetch(path(name), {
    method: "PUT",
    body: JSON.stringify({ ...profileValues(values), author: AUTHOR, reason, expected_version: expectedVersion }),
  }) as Promise<Profile>;
}

export function deleteProfile(name: string, reason: string): Promise<unknown> {
  return apiFetch(`${path(name)}?author=${AUTHOR}&reason=${encodeURIComponent(reason)}`, { method: "DELETE" });
}

export function profileError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const detail = (JSON.parse(raw) as { detail?: unknown }).detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => (typeof d === "object" && d && "msg" in d ? String(d.msg) : String(d))).join("; ");
    }
  } catch {
    return errorText(err);
  }
  return errorText(err);
}
