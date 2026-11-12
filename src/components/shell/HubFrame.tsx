import { useEffect, useState, type ReactNode } from "react";

import { TitleBar } from "@/components/layout/TitleBar";
import { startNewChat, startSessionSync, useOpenChatTitle } from "@/features/chat/openSession";
import { SettingsDialog } from "@/features/settings/SettingsPage";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useRunningCount } from "@/hooks/useRunningCount";
import { isTauri } from "@/lib/isTauri";
import { openPaletteFromTap, usePaletteStore } from "@/nav/paletteSources";
import { useShellStore } from "@/nav/shellFlag";
import { useNavStore } from "@/store/navStore";
import { useUiStore } from "@/store/uiStore";
import { CommandPalette } from "./CommandPalette";
import { DetailSlotContext } from "./detailSlot";
import { HubBottomBar } from "./HubBottomBar";
import { HubMoreSheet } from "./HubMoreSheet";
import { HubRail } from "./HubRail";
import { HubTitleRow } from "./HubTitleRow";
import { PhoneHeader } from "./PhoneHeader";

interface HubFrameProps {
  children: ReactNode;
  docked?: ReactNode;
}

const OVERLAY = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]';

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

// iOS raises the keyboard only for a focus made inside the tap, so phone search goes through the
// proxy input; nothing is open behind it, so the body can host that input.
function phoneSearch() {
  openPaletteFromTap(document.body);
}

function desktopSearch() {
  usePaletteStore.getState().setOpen(true);
}

const NEW_CHAT = { label: "New chat", onClick: startNewChat };

/** The six-hub shell: header, content, docked field and hub bar on phones; rail and page panel
 * with the title row from 640px. */
export function HubFrame({ children, docked }: HubFrameProps) {
  const isMobile = useIsMobile();
  const settingsOpen = useShellStore((s) => s.settingsOpen);
  const setSettingsOpen = useShellStore((s) => s.setSettingsOpen);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const inChat = useNavStore((s) => s.hub === "chat");
  // Chat docks its own composer inside the conversation pane, so it is never beside the list.
  const dock = inChat ? null : docked;

  useEffect(startSessionSync, []);

  useEffect(
    () =>
      useNavStore.subscribe((s, prev) => {
        if (s.hub !== prev.hub || s.view !== prev.view) useUiStore.getState().syncPage();
      }),
    []
  );

  // Escape closes the palette, then a sheet or panel, then the reader, and never changes the hub.
  // The palette and every Base UI dialog take their own Escape; a reader is all that is left here.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/") {
        // Journal's own "/" focuses its search; an open dialog, menu or select keeps its keys.
        const nav = useNavStore.getState();
        const journal = nav.hub === "library" && nav.view.library === "journal";
        if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || journal || isTyping(e.target)) return;
        if (document.querySelector(OVERLAY)) return;
        e.preventDefault();
        usePaletteStore.getState().setOpen(true);
        return;
      }
      if (e.key !== "Escape" || document.querySelector('[role="dialog"]')) return;
      const nav = useNavStore.getState();
      // Chat's open session is the conversation on screen, not a sheet.
      if (nav.hub === "chat") return;
      if (nav.open[nav.hub] || nav.read[nav.hub]) nav.closeItem();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openSettings = () => setSettingsOpen(true);

  return (
    <div className="fixed inset-x-0 top-[var(--app-offset-top,0px)] flex h-[var(--app-height,100dvh)] flex-col overflow-hidden bg-bg pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] text-ink sm:bg-sidebar">
      {isTauri && <TitleBar />}
      <DetailSlotContext.Provider value={slot}>
        {isMobile ? (
          <PhoneFrame docked={dock} onSettings={openSettings}>
            {children}
          </PhoneFrame>
        ) : (
          <div ref={setSlot} className="flex min-h-0 flex-1">
            <HubRail onSettings={openSettings} />
            <main className="relative my-2 mr-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-bg">
              <HubTitleRow onSearch={desktopSearch} action={inChat ? NEW_CHAT : undefined} />
              {children}
              {dock}
            </main>
          </div>
        )}
      </DetailSlotContext.Provider>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette />
    </div>
  );
}

function PhoneFrame({ children, docked, onSettings }: HubFrameProps & { onSettings: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const running = useRunningCount();
  const chatTitle = useOpenChatTitle();

  return (
    <>
      <PhoneHeader onSearch={phoneSearch} onSettings={onSettings} chatTitle={chatTitle} chatAction={NEW_CHAT} />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      {docked}
      <HubBottomBar moreOpen={moreOpen} onMore={() => setMoreOpen(true)} running={running} />
      <HubMoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        onSearch={phoneSearch}
        onSettings={onSettings}
        summaries={{ agents: running > 0 ? `${running} running` : "Nothing running" }}
      />
    </>
  );
}
