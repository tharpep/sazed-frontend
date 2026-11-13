import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ShellAction } from "./hubMeta";

interface ToolsRowProps {
  picker?: ReactNode;
  action?: ShellAction;
}

/** The top of a view's content: its ViewPicker, then its primary action on phones (HubTitleRow
 * carries the action from sm up). */
export function ToolsRow({ picker, action }: ToolsRowProps) {
  if (!picker && !action) return null;
  return (
    <div className={cn("mb-3 flex min-w-0 items-center gap-2", !picker && "sm:hidden")}>
      {picker}
      <span className="flex-1" />
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex min-h-11 flex-none items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-meta text-muted transition-colors hover:bg-raised hover:text-ink sm:min-h-7"
        >
          <Plus className="size-4" aria-hidden="true" />
          {action.label}
        </button>
      )}
    </div>
  );
}
