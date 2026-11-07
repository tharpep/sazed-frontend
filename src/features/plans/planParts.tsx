import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { StatusPill, type Tone } from "@/components/system";
import type { PlanState } from "@/api/plans";
import type { CardStage } from "@/api/projects";
import { age } from "@/features/homelab/format";

const STATE_TONE: Record<PlanState, Tone> = { active: "ok", draft: "neutral", done: "neutral", superseded: "neutral" };

export function PlanStatePill({ state }: { state: PlanState }) {
  return <StatusPill tone={STATE_TONE[state]}>{state}</StatusPill>;
}

export const STAGE_DOT: Record<CardStage, string> = {
  done: "bg-ok",
  doing: "bg-primary",
  needs_me: "bg-warn",
  next: "bg-muted",
  inbox: "bg-muted/50",
};

export const isAgent = (author: string) => author.startsWith("agent:") || author.startsWith("dispatch:");

export function authorLabel(author: string): string {
  const [kind, name] = author.split(":");
  if (!name) return author.charAt(0).toUpperCase() + author.slice(1);
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return kind === "agent" ? cap : `${kind.charAt(0).toUpperCase() + kind.slice(1)} ${name}`;
}

export function Author({ name }: { name: string }) {
  return <span className={isAgent(name) ? "text-primary" : undefined}>{authorLabel(name)}</span>;
}

export function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const a = age(iso);
  return a ? `${a} ago` : "just now";
}

export const stripId = (title: string) => title.replace(/\s*\{#[^}]+\}\s*$/, "");

export function PlanMarkdown({ children }: { children: string }) {
  return (
    <div className="prose-journal min-w-0 text-body text-ink-2 [overflow-wrap:anywhere]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
