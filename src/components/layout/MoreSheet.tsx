import { useEffect } from "react";
import { Activity, BookOpen, FolderKanban, History as HistoryIcon, Gauge, LayoutGrid, Lightbulb, ScrollText, Settings as SettingsIcon, Waypoints } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useUiStore } from "@/store/uiStore";

/** Phone-only overflow sheet for the destinations that don't fit in the
 * 5-slot bottom tab bar (Conversations, Gateway, Journal, Backlog, Settings, Activity) plus the appearance toggle
 * that lives at the bottom of the desktop rail. */
export function MoreSheet() {
  const moreOpen = useUiStore((s) => s.moreOpen);
  const setMoreOpen = useUiStore((s) => s.setMoreOpen);
  const toggleAudit = useUiStore((s) => s.toggleAudit);
  const toggleHistory = useUiStore((s) => s.toggleHistory);
  const toggleJournal = useUiStore((s) => s.toggleJournal);
  const toggleGateway = useUiStore((s) => s.toggleGateway);
  const toggleBacklog = useUiStore((s) => s.toggleBacklog);
  const toggleProjects = useUiStore((s) => s.toggleProjects);
  const togglePlans = useUiStore((s) => s.togglePlans);
  const toggleApps = useUiStore((s) => s.toggleApps);
  const toggleClaudeUsage = useUiStore((s) => s.toggleClaudeUsage);
  const toggleSettings = useUiStore((s) => s.toggleSettings);
  const isMobile = useIsMobile();

  // SheetContent is sm:hidden, but the primitive's backdrop isn't scoped to
  // that breakpoint — without this, resizing/rotating past sm while the
  // sheet is open leaves an invisible full-viewport overlay eating the next
  // click on the desktop layout underneath.
  useEffect(() => {
    if (!isMobile && moreOpen) setMoreOpen(false);
  }, [isMobile, moreOpen, setMoreOpen]);

  return (
    <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
      <SheetContent side="bottom" className="sm:hidden">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 px-4 pb-2">
          <button
            type="button"
            onClick={toggleHistory}
            className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface"
          >
            <HistoryIcon className="size-4 text-muted" aria-hidden="true" />
            Conversations
          </button>
          <button
            type="button"
            onClick={toggleApps}
            className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface"
          >
            <LayoutGrid className="size-4 text-muted" aria-hidden="true" />
            Apps
          </button>
          <button
            type="button"
            onClick={toggleGateway}
            className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface"
          >
            <Waypoints className="size-4 text-muted" aria-hidden="true" />
            Gateway
          </button>
          <button
            type="button"
            onClick={toggleJournal}
            className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface"
          >
            <BookOpen className="size-4 text-muted" aria-hidden="true" />
            Journal
          </button>
          <button
            type="button"
            onClick={toggleProjects}
            className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface"
          >
            <FolderKanban className="size-4 text-muted" aria-hidden="true" />
            Projects
          </button>
          <button
            type="button"
            onClick={togglePlans}
            className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface"
          >
            <ScrollText className="size-4 text-muted" aria-hidden="true" />
            Plans
          </button>
          <button
            type="button"
            onClick={toggleBacklog}
            className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface"
          >
            <Lightbulb className="size-4 text-muted" aria-hidden="true" />
            Backlog
          </button>
          <button
            type="button"
            onClick={toggleClaudeUsage}
            className="flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface"
          >
            <Gauge className="size-4 text-muted" aria-hidden="true" />
            Usage
          </button>
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
            <Activity className="size-4 text-muted" aria-hidden="true" />
            Activity
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
