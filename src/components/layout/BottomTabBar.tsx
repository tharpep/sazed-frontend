import type { ComponentType } from "react";
import { BookOpen, History as HistoryIcon, Library, MessageCircle, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";

type TabKey = "chat" | "history" | "journal" | "kb" | "more";

interface TabDef {
  key: TabKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { key: "chat", label: "Chat", icon: MessageCircle },
  { key: "history", label: "History", icon: HistoryIcon },
  { key: "journal", label: "Journal", icon: BookOpen },
  { key: "kb", label: "Knowledge", icon: Library },
  { key: "more", label: "More", icon: MoreHorizontal },
];

/** Phone-width primary nav — replaces the icon rail below the sm breakpoint,
 * placed in the thumb-reachable bottom zone instead of a top-corner menu. */
export function BottomTabBar() {
  const historyOpen = useUiStore((s) => s.historyOpen);
  const journalOpen = useUiStore((s) => s.journalOpen);
  const kbOpen = useUiStore((s) => s.kbOpen);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const auditOpen = useUiStore((s) => s.auditOpen);
  const moreOpen = useUiStore((s) => s.moreOpen);
  const toggleHistory = useUiStore((s) => s.toggleHistory);
  const toggleJournal = useUiStore((s) => s.toggleJournal);
  const toggleKb = useUiStore((s) => s.toggleKb);
  const toggleMore = useUiStore((s) => s.toggleMore);
  const closeAll = useUiStore((s) => s.closeAll);

  const active: TabKey = historyOpen
    ? "history"
    : journalOpen
      ? "journal"
      : kbOpen
        ? "kb"
        : settingsOpen || auditOpen || moreOpen
          ? "more"
          : "chat";

  function handleTap(key: TabKey) {
    if (key === "chat") closeAll();
    else if (key === "history") toggleHistory();
    else if (key === "journal") toggleJournal();
    else if (key === "kb") toggleKb();
    else toggleMore();
  }

  return (
    <nav
      aria-label="Primary"
      className="flex shrink-0 items-stretch border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      {TABS.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => handleTap(key)}
            aria-label={label}
            aria-pressed={isActive}
            className="flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 py-1.5"
          >
            <Icon className={cn("size-5", isActive ? "text-primary" : "text-muted")} aria-hidden="true" />
            <span
              className={cn(
                "text-[11px] font-medium leading-none",
                isActive ? "text-primary" : "text-muted"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
