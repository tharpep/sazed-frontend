export type StepKind = "edit" | "read" | "run" | "search" | "web" | "other";

const KIND_BY_TOOL: [RegExp, StepKind][] = [
  [/^(edit|write|multiedit|notebookedit|replace|create_file)/i, "edit"],
  [/^(read|view|cat|open_file)/i, "read"],
  [/^(bash|run|shell|exec)/i, "run"],
  [/^(grep|glob|search|find|ls|list)/i, "search"],
  [/^(web|fetch|read_url|browse|google)/i, "web"],
];

export const STEP_LETTER: Record<StepKind, string> = {
  edit: "E",
  read: "R",
  run: "B",
  search: "S",
  web: "W",
  other: "·",
};

export interface StepParts {
  kind: StepKind;
  tool: string;
  detail: string;
}

export function stepParts(step: string): StepParts {
  const at = step.indexOf(": ");
  const tool = at >= 0 ? step.slice(0, at) : step;
  const raw = at >= 0 ? step.slice(at + 2) : "";
  const inRepo = raw.indexOf("/repo/");
  const detail = inRepo >= 0 ? raw.slice(inRepo + 6) : raw;
  const kind = KIND_BY_TOOL.find(([re]) => re.test(tool))?.[1] ?? "other";
  return { kind, tool, detail: detail || tool };
}

export function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (!m) return `${s}s`;
  return s ? `${m}m${String(s).padStart(2, "0")}s` : `${m}m`;
}
