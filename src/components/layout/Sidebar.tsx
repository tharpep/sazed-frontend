import { useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Library,
  MessagesSquare,
  House,
  Activity,
  Gauge,
  CalendarClock,
  Lightbulb,
  FolderKanban,
  LayoutGrid,
  ScrollText,
  Server,
  SlidersHorizontal,
  Waypoints,
  Settings as SettingsIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConversationDrillDown, ConversationList, useConversationList } from "@/features/chat/ConversationList";
import { useWaitingCount } from "@/hooks/useWaitingCount";
import { useUiStore } from "@/store/uiStore";
import { useSessionStore } from "@/store/sessionStore";
import { useChatStore } from "@/store/chatStore";

interface NavItemProps {
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  /** Small count on the right, e.g. jobs waiting on you. */
  count?: number;
}

/**
 * One nav entry: icon and label from md up, icon-only rail (with a tooltip) between sm and md,
 * where 220px of labels would squeeze the page.
 */
function NavItem({ label, icon: Icon, active, onClick, count }: NavItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            aria-current={active ? "page" : undefined}
            onClick={onClick}
            className={cn(
              "relative flex h-8 w-full items-center justify-center gap-2.5 rounded-md text-meta text-muted transition-colors md:justify-start md:px-2",
              "hover:bg-raised/60 hover:text-ink",
              active && "bg-surface text-ink dark:bg-raised"
            )}
          />
        }
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden truncate md:inline">{label}</span>
        {count ? (
          <span className="absolute top-1 right-1.5 text-caption text-warn tabular-nums md:static md:ml-auto">
            {count}
          </span>
        ) : null}
      </TooltipTrigger>
      <TooltipContent side="right" className="md:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function NavGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-px">
      {label && <span className="hidden px-2 pb-1 text-caption text-muted md:block">{label}</span>}
      {children}
    </div>
  );
}

export function Sidebar() {
  const historyOpen = useUiStore((s) => s.historyOpen);
  const journalOpen = useUiStore((s) => s.journalOpen);
  const kbOpen = useUiStore((s) => s.kbOpen);
  const homelabOpen = useUiStore((s) => s.homelabOpen);
  const gatewayOpen = useUiStore((s) => s.gatewayOpen);
  const automationsOpen = useUiStore((s) => s.automationsOpen);
  const backlogOpen = useUiStore((s) => s.backlogOpen);
  const projectsOpen = useUiStore((s) => s.projectsOpen);
  const plansOpen = useUiStore((s) => s.plansOpen);
  const appsOpen = useUiStore((s) => s.appsOpen);
  const profilesOpen = useUiStore((s) => s.profilesOpen);
  const claudeUsageOpen = useUiStore((s) => s.claudeUsageOpen);
  const auditOpen = useUiStore((s) => s.auditOpen);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const toggleHistory = useUiStore((s) => s.toggleHistory);
  const toggleJournal = useUiStore((s) => s.toggleJournal);
  const toggleKb = useUiStore((s) => s.toggleKb);
  const toggleHomelab = useUiStore((s) => s.toggleHomelab);
  const toggleGateway = useUiStore((s) => s.toggleGateway);
  const toggleAutomations = useUiStore((s) => s.toggleAutomations);
  const toggleBacklog = useUiStore((s) => s.toggleBacklog);
  const toggleProjects = useUiStore((s) => s.toggleProjects);
  const togglePlans = useUiStore((s) => s.togglePlans);
  const toggleApps = useUiStore((s) => s.toggleApps);
  const toggleProfiles = useUiStore((s) => s.toggleProfiles);
  const toggleClaudeUsage = useUiStore((s) => s.toggleClaudeUsage);
  const toggleAudit = useUiStore((s) => s.toggleAudit);
  const toggleSettings = useUiStore((s) => s.toggleSettings);
  const setHistoryOpen = useUiStore((s) => s.setHistoryOpen);

  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const selectSession = useSessionStore((s) => s.selectSession);
  const loadSession = useChatStore((s) => s.loadSession);
  const newSession = useChatStore((s) => s.newSession);

  const online = useUiStore((s) => s.online);
  const waiting = useWaitingCount();
  const onHome =
    !historyOpen && !journalOpen && !kbOpen && !homelabOpen && !gatewayOpen && !automationsOpen && !backlogOpen && !projectsOpen && !plansOpen && !appsOpen && !profilesOpen && !claudeUsageOpen && !auditOpen && !settingsOpen;

  const [query, setQuery] = useState("");
  const data = useConversationList(historyOpen, query);

  function handleNewChat() {
    newSession();
    setHistoryOpen(false);
  }

  function handleSelectSession(id: string) {
    selectSession(id);
    loadSession(id);
  }

  const list = {
    data,
    query,
    onQuery: setQuery,
    activeId: activeSessionId,
    onSelect: handleSelectSession,
  };

  return (
    <>
      {/* Desktop / tablet: icon rail + inline sliding panel. */}
      <div className="hidden h-full sm:flex">
        <nav
          aria-label="Primary"
          className="flex w-14 shrink-0 flex-col items-center gap-[18px] bg-sidebar px-2 py-4 md:w-[220px] md:items-stretch md:px-2.5"
        >
          <div className="flex items-center gap-2 md:px-2">
            <span className="grid size-[22px] place-items-center rounded-md bg-ink text-caption font-semibold text-bg">S</span>
            <span className="hidden text-title font-semibold text-ink md:inline">Sazed</span>
            {!online && (
              <span className="hidden text-caption text-err md:ml-auto md:inline" role="status">
                Offline
              </span>
            )}
          </div>
          <NavGroup>
            <NavItem label="Home" icon={House} active={onHome} onClick={handleNewChat} />
            <NavItem label="Chats" icon={MessagesSquare} active={historyOpen} onClick={toggleHistory} />
          </NavGroup>
          <NavGroup label="Watch">
            <NavItem label="Homelab" icon={Server} active={homelabOpen} onClick={toggleHomelab} />
            <NavItem label="Apps" icon={LayoutGrid} active={appsOpen} onClick={toggleApps} />
            <NavItem label="Activity" icon={Activity} active={auditOpen} onClick={toggleAudit} count={waiting} />
            <NavItem label="Gateway" icon={Waypoints} active={gatewayOpen} onClick={toggleGateway} />
            <NavItem label="Usage" icon={Gauge} active={claudeUsageOpen} onClick={toggleClaudeUsage} />
          </NavGroup>
          <NavGroup label="Work">
            <NavItem label="Automations" icon={CalendarClock} active={automationsOpen} onClick={toggleAutomations} />
            <NavItem label="Projects" icon={FolderKanban} active={projectsOpen} onClick={toggleProjects} />
            <NavItem label="Plans" icon={ScrollText} active={plansOpen} onClick={togglePlans} />
            <NavItem label="Profiles" icon={SlidersHorizontal} active={profilesOpen} onClick={toggleProfiles} />
            <NavItem label="Backlog" icon={Lightbulb} active={backlogOpen} onClick={toggleBacklog} />
            <NavItem label="Knowledge" icon={Library} active={kbOpen} onClick={toggleKb} />
            <NavItem label="Journal" icon={BookOpen} active={journalOpen} onClick={toggleJournal} />
          </NavGroup>
          <div className="mt-auto w-full">
            <NavItem label="Settings" icon={SettingsIcon} active={settingsOpen} onClick={toggleSettings} />
          </div>
        </nav>

        <AnimatePresence initial={false}>
          {historyOpen && (
            <motion.div
              key="history-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden bg-sidebar"
            >
              <div className="flex h-full w-[260px] flex-col">
                <div className="flex items-center justify-between px-3 pt-3 pb-2">
                  <h2 className="text-sm font-medium tracking-wide text-ink">Conversations</h2>
                </div>
                <ConversationList variant="panel" {...list} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConversationDrillDown
        open={historyOpen}
        onBack={() => setHistoryOpen(false)}
        onNewChat={handleNewChat}
        {...list}
      />
    </>
  );
}
