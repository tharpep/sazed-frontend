import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Bell,
  Brain,
  Calendar,
  ChevronRight,
  DollarSign,
  ListChecks,
  Library,
  Mail,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ToolBlock } from "@/mock/data";

const CATEGORY_ICON: Record<ToolBlock["category"], React.ComponentType<{ className?: string }>> = {
  calendar: Calendar,
  email: Mail,
  tasks: ListChecks,
  kb: Library,
  notify: Bell,
  memory: Brain,
  finance: DollarSign,
};

function ToolRow({ tool }: { tool: ToolBlock }) {
  const Icon = CATEGORY_ICON[tool.category];
  return (
    <div className="flex items-start gap-2 rounded-md px-2 py-1.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <span className="text-sm text-ink">{tool.label}</span>
        {tool.status === "error" && tool.error && (
          <p className="mt-0.5 text-xs text-destructive">{tool.error}</p>
        )}
      </div>
      {tool.status === "pending" && (
        <span className="mt-1 size-1.5 shrink-0 animate-pulse rounded-full bg-muted" />
      )}
      {tool.status === "success" && (
        <span className="mt-0.5 shrink-0 text-xs text-primary">done</span>
      )}
      {tool.status === "error" && (
        <span className="mt-0.5 shrink-0 text-xs text-destructive">failed</span>
      )}
    </div>
  );
}

export function ToolCallCard({ tools }: { tools: ToolBlock[] }) {
  const [open, setOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  if (tools.length === 0) return null;

  const pending = tools.filter((t) => t.status === "pending").length;
  const summary =
    pending > 0 ? `${tools.length - pending}/${tools.length} tools` : `${tools.length} tool${tools.length > 1 ? "s" : ""} used`;

  return (
    <div className="my-1.5 max-w-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md py-1 text-xs text-muted transition-colors hover:text-ink"
      >
        <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} aria-hidden="true" />
        {summary}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 rounded-lg border border-border bg-surface/60 p-1">
              {tools.map((tool, i) => (
                <ToolRow key={i} tool={tool} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
