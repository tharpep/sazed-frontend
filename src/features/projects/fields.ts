export const field =
  "w-full min-w-0 rounded-md border border-line bg-bg px-2.5 py-1.5 text-meta text-ink outline-none placeholder:text-muted focus-visible:border-primary";

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 41);
}
