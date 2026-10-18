import { age } from "@/features/homelab/format";

export const ORIGIN_LABEL: Record<string, string> = {
  upload: "File",
  text: "Text",
  url: "Web page",
  drive: "Drive",
};

// Chunks are stored with a Contextual Retrieval prefix ("From 'name' (summary) [section]: ").
// Drop it for display so a search hit shows the matched text itself.
const PREFIX = /^From '[^']*'(?: \([\s\S]*?\))?(?: \[[^\]]*\])?: /;

export function chunkText(content: string): string {
  return content.replace(PREFIX, "");
}

export const field =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-primary";

export function addedAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const a = age(iso);
  return a ? `${a} ago` : "just now";
}
