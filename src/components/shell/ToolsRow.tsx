import { useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";

import { useIsMobile } from "@/hooks/useIsMobile";
import { ActionSlotContext } from "./actionSlot";
import type { ShellAction } from "./hubMeta";
import { TitleAction } from "./HubTitleRow";

interface ToolsRowProps {
  picker?: ReactNode;
  action?: ShellAction;
}

/** The top of a view's content: its ViewPicker and, on phones, its primary action. From 640px up
 * the action moves into HubTitleRow. */
export function ToolsRow({ picker, action }: ToolsRowProps) {
  const isMobile = useIsMobile();
  const slot = useContext(ActionSlotContext);
  const inTitle = !isMobile && slot !== null;
  const rowAction = inTitle ? undefined : action;
  const Icon = action?.icon ?? Plus;

  return (
    <>
      {inTitle && action && createPortal(<TitleAction action={action} />, slot)}
      {(picker || rowAction) && (
        <div className="mb-3 flex min-w-0 items-center gap-2">
          {picker}
          <span className="flex-1" />
          {rowAction && (
            <button
              type="button"
              onClick={rowAction.onClick}
              className="inline-flex min-h-11 flex-none items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-meta text-muted transition-colors hover:bg-raised hover:text-ink sm:min-h-7"
            >
              <Icon className="size-4" aria-hidden="true" />
              {rowAction.label}
            </button>
          )}
        </div>
      )}
    </>
  );
}
