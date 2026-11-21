import { useEffect, useMemo } from "react";
import * as z from "zod";

import { getWidget } from "./catalog";
import { FallbackCard } from "./FallbackCard";

interface WidgetRendererProps {
  name: string;
  props: Record<string, unknown>;
  onSend?: (text: string) => void;
}

interface Problem {
  path: PropertyKey[];
  message: string;
  /** The payload has a key this branch forbids with z.never(), so it is the other shape. */
  foreign: boolean;
}

function fit(problems: Problem[]): number {
  return (problems.some((p) => p.foreign) ? 1_000_000 : 0) + problems.length;
}

// A union reports every branch's issues. The shape the payload meant is the branch it has no
// foreign key for, then the one with the fewest problems.
function leafProblems(issues: readonly z.core.$ZodIssue[], prefix: PropertyKey[] = []): Problem[] {
  return issues.flatMap((issue) => {
    const path = [...prefix, ...issue.path];
    if (issue.code === "invalid_union" && issue.errors.length > 0) {
      return issue.errors.map((branch) => leafProblems(branch, path)).reduce((a, b) => (fit(b) < fit(a) ? b : a));
    }
    return [{ path, message: issue.message, foreign: issue.code === "invalid_type" && issue.expected === "never" }];
  });
}

function problemLines(error: z.ZodError): string[] {
  return leafProblems(error.issues).map(({ path, message }) => `${path.length ? path.map(String).join(".") : "props"}: ${message}`);
}

/** One line for the card: the first failing field, then how many fields failed. */
export function shortReason(error: z.ZodError): string {
  const lines = problemLines(error);
  return `${lines[0]} (${lines.length === 1 ? "1 field invalid" : `${lines.length} fields invalid`})`;
}

function resolveProps(name: string, props: Record<string, unknown>) {
  const entry = getWidget(name);
  if (!entry) return { error: "not in the widget catalog", detail: "Not in the widget catalog." };
  if (entry.live && Object.keys(props).length === 0) return { entry, data: {} };
  const parsed = entry.props.safeParse(props);
  if (!parsed.success) return { error: shortReason(parsed.error), detail: problemLines(parsed.error).join("\n") };
  return { entry, data: parsed.data as Record<string, unknown> };
}

export function WidgetRenderer({ name, props, onSend }: WidgetRendererProps) {
  const resolved = useMemo(() => resolveProps(name, props), [name, props]);
  const { entry, data, error, detail } = resolved;

  useEffect(() => {
    if (detail) console.warn(`Widget ${name}: ${detail}`, props);
  }, [name, detail, props]);

  if (!entry) return <FallbackCard name={name} reason={error ?? ""} />;
  const Component = entry.component;
  return <Component {...data} onSend={onSend} />;
}
