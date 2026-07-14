import { ScrollText, Settings as SettingsIcon } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useUiStore } from "@/store/uiStore";

/** Phone-only overflow sheet for the destinations that don't fit in the
 * 5-slot bottom tab bar (Settings, Tool log) plus the appearance toggle
 * that lives at the bottom of the desktop rail. */
export function MoreSheet() {
  const moreOpen = useUiStore((s) => s.moreOpen);
  const setMoreOpen = useUiStore((s) => s.setMoreOpen);
  const toggleAudit = useUiStore((s) => s.toggleAudit);
  const toggleSettings = useUiStore((s) => s.toggleSettings);

  return (
    <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
      <SheetContent side="bottom" className="sm:hidden">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-4 pb-2">
          <button
            type="button"
            onClick={toggleSettings}
            className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface"
          >
            <SettingsIcon className="size-4 text-muted" aria-hidden="true" />
            Settings
          </button>
          <button
            type="button"
            onClick={toggleAudit}
            className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface"
          >
            <ScrollText className="size-4 text-muted" aria-hidden="true" />
            Tool log
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <span className="text-sm text-muted">Appearance</span>
          <ThemeToggle orientation="horizontal" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
