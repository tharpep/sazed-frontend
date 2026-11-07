import { apiFetch } from "./client";
import { errorText } from "./homelab";

export interface ProfileValues {
  model: string;
  effort: string;
  budget_usd: number;
  timeout_s: number;
  read_only: boolean;
  evidence_required: boolean;
  description: string;
}

export interface Profile extends ProfileValues {
  name: string;
  updated_by: string;
  updated_at: string;
  version: number;
}

export interface ProfileVersion {
  version: number;
  author: string;
  reason: string;
  at: string;
  profile: ProfileValues;
}

export interface ProfileDetail extends Profile {
  history: ProfileVersion[];
}

export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export const MODEL_ALIASES = ["haiku", "sonnet", "opus", "fable"] as const;
export const NAME_PATTERN = /^[a-z][a-z0-9-]{1,30}$/;
export const MODEL_PATTERN = /^(haiku|sonnet|opus|fable|claude-.+)$/;
export const BUDGET_RANGE = [0.05, 50] as const;
export const TIMEOUT_RANGE = [60, 7200] as const;

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
    body: JSON.stringify({ ...values, author: AUTHOR, reason, expected_version: expectedVersion }),
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
