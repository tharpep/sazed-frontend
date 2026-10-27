import type { ComponentType } from "react";
import { CalendarClock, House, Library, MoreHorizontal, Server } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import { useChatStore } from "@/store/chatStore";

type TabKey = "home" | "homelab" | "automations" | "kb" | "more";

interface TabDef {
  key: TabKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  // Home is the app launcher and the chat: the old Chat and Apps tabs merged.
  { key: "home", label: "Home", icon: House },
  { key: "homelab", label: "Homelab", icon: Server },
  // "Automations" doesn't fit next to "Knowledge" on a 375px phone.
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
  const gatewayOpen = useUiStore((s) => s.gatewayOpen);
  const automationsOpen = useUiStore((s) => s.automationsOpen);
  const backlogOpen = useUiStore((s) => s.backlogOpen);
  const moreOpen = useUiStore((s) => s.moreOpen);
  const toggleHomelab = useUiStore((s) => s.toggleHomelab);
  const toggleAutomations = useUiStore((s) => s.toggleAutomations);
  const toggleKb = useUiStore((s) => s.toggleKb);
  const toggleMore = useUiStore((s) => s.toggleMore);
  const closeAll = useUiStore((s) => s.closeAll);
  const hasChat = useChatStore((s) => s.messages.length > 0);
  const newSession = useChatStore((s) => s.newSession);

  const active: TabKey = homelabOpen
    ? "homelab"
    : automationsOpen
      ? "automations"
      : kbOpen
        ? "kb"
        : settingsOpen || auditOpen || historyOpen || gatewayOpen || journalOpen || backlogOpen || moreOpen
          ? "more"
          : "home";

  function handleTap(key: TabKey) {
    // Tapping Home while already on a conversation goes back to the launcher (a new chat; the
    // old one stays in Conversations).
    if (key === "home") active === "home" && hasChat ? newSession() : closeAll();
    else if (key === "homelab") toggleHomelab();
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
