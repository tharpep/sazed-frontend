import { useLayoutEffect, useRef } from "react";
import { ChevronLeft, Plus, Search, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { useNavStore } from "@/store/navStore";
import { hasViewTabs, hubDef, shortLabel, type ShellAction } from "./hubMeta";

interface PhoneHeaderProps {
  onSearch: () => void;
  onSettings: () => void;
  chatTitle?: string;
  chatAction?: ShellAction;
}

const iconButton =
  "grid size-11 flex-none place-items-center rounded-[10px] text-ink-2 transition-colors hover:bg-raised hover:text-ink";

function dateLabel(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** The phone's one 54px header row: view tabs on a hub with views, otherwise a title. */
export function PhoneHeader({ onSearch, onSettings, chatTitle, chatAction }: PhoneHeaderProps) {
  const hub = useNavStore((s) => s.hub);
  const view = useNavStore((s) => s.view[s.hub]);
  const go = useNavStore((s) => s.go);
  const tabsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // scrollLeft rather than scrollIntoView, which would also scroll the page.
    const strip = tabsRef.current;
    const tab = strip?.querySelector<HTMLElement>("[aria-selected='true']");
    if (!strip || !tab) return;
    if (tab.offsetLeft + tab.offsetWidth > strip.clientWidth + strip.scrollLeft) strip.scrollLeft = tab.offsetLeft - 24;
    else if (tab.offsetLeft < strip.scrollLeft) strip.scrollLeft = tab.offsetLeft;
  }, [hub, view]);

  const search = (
    <button type="button" onClick={onSearch} aria-label="Search" className={iconButton}>
      <Search className="size-5" aria-hidden="true" />
    </button>
  );
  const row = "flex h-(--phone-head-h) flex-none items-center gap-0.5 border-b border-line bg-bg pr-1";
  const title = "min-w-0 flex-1 truncate text-title font-semibold text-ink";

  if (hub === "home") {
    return (
      <header className={cn(row, "pl-4")}>
        <span className="flex-1 text-meta text-ink-2">{dateLabel(new Date())}</span>
        {search}
        <button type="button" onClick={onSettings} aria-label="Settings" className={iconButton}>
          <Settings className="size-5" aria-hidden="true" />
        </button>
      </header>
    );
  }

  if (hub === "chat") {
    if (view === "conversation") {
      return (
        <header className={cn(row, "pl-1")}>
          <button type="button" onClick={() => go("chat", "list")} aria-label="Back to chats" className={iconButton}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <h1 className={title}>{chatTitle ?? "Conversation"}</h1>
          {search}
        </header>
      );
    }
    return (
      <header className={cn(row, "pl-4")}>
        <h1 className={title}>Chats</h1>
        {chatAction && (
          <button type="button" onClick={chatAction.onClick} aria-label={chatAction.label} className={iconButton}>
            <Plus className="size-5" aria-hidden="true" />
          </button>
        )}
        {search}
      </header>
    );
  }

  const def = hubDef(hub);
  if (!hasViewTabs(hub)) {
    return (
      <header className={cn(row, "pl-4")}>
        <h1 className={title}>{def.label}</h1>
        {search}
      </header>
    );
  }

  return (
    <header className={cn(row, "pl-1")}>
      <div
        ref={tabsRef}
        role="tablist"
        aria-label={`${def.label} views`}
        className="relative flex min-w-0 flex-1 items-center gap-0.5 self-stretch overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {def.views.map((v) => {
          const selected = v.id === view;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => go(hub, v.id)}
              className={cn(
                "relative min-h-11 flex-none whitespace-nowrap px-2.5 text-body",
                selected
                  ? "font-medium text-ink after:absolute after:inset-x-2.5 after:-bottom-1 after:h-0.5 after:rounded-[1px] after:bg-ink"
                  : "text-ink-2"
              )}
            >
              {shortLabel(hub, v)}
            </button>
          );
        })}
      </div>
      {search}
    </header>
  );
}
