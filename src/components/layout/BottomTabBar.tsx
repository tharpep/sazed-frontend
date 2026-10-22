import type { ComponentType } from "react";
import {
  CalendarClock,
  LayoutGrid,
  Library,
  MessageCircle,
  MoreHorizontal,
  Server,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";

type TabKey = "chat" | "homelab" | "apps" | "automations" | "kb" | "more";

interface TabDef {
  key: TabKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { key: "chat", label: "Chat", icon: MessageCircle },
  { key: "homelab", label: "Homelab", icon: Server },
  { key: "apps", label: "Apps", icon: LayoutGrid },
  // Six tabs leave ~62px each on a 375px phone; "Automations" doesn't fit next to "Knowledge".
  { key: "automations", label: "Automate", icon: CalendarClock },
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
  const homelabOpen = useUiStore((s) => s.homelabOpen);
  const appsOpen = useUiStore((s) => s.appsOpen);
  const gatewayOpen = useUiStore((s) => s.gatewayOpen);
  const automationsOpen = useUiStore((s) => s.automationsOpen);
  const backlogOpen = useUiStore((s) => s.backlogOpen);
  const moreOpen = useUiStore((s) => s.moreOpen);
  const toggleHomelab = useUiStore((s) => s.toggleHomelab);
  const toggleApps = useUiStore((s) => s.toggleApps);
  const toggleAutomations = useUiStore((s) => s.toggleAutomations);
  const toggleKb = useUiStore((s) => s.toggleKb);
  const toggleMore = useUiStore((s) => s.toggleMore);
  const closeAll = useUiStore((s) => s.closeAll);

  const active: TabKey = homelabOpen
    ? "homelab"
    : appsOpen
      ? "apps"
      : automationsOpen
      ? "automations"
      : kbOpen
        ? "kb"
        : settingsOpen || auditOpen || historyOpen || gatewayOpen || journalOpen || backlogOpen || moreOpen
          ? "more"
          : "chat";

  function handleTap(key: TabKey) {
    if (key === "chat") closeAll();
    else if (key === "homelab") toggleHomelab();
    else if (key === "apps") toggleApps();
    else if (key === "automations") toggleAutomations();
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
