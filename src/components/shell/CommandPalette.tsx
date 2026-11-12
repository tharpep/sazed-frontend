import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ChevronRight, Clock, Compass, ExternalLink, MessageSquarePlus, Search, Settings, SunMoon, type LucideIcon } from "lucide-react";

import { fetchServices, type Service } from "@/api/homelab";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import type { NavTarget } from "@/nav/hubViews";
import {
  buildEntries,
  itemProviders,
  rankEntries,
  usePaletteStore,
  type PaletteAction,
  type PaletteEntry,
  type PaletteItem,
} from "@/nav/paletteSources";
import { useChatStore } from "@/store/chatStore";
import { useNavStore, type ItemRef } from "@/store/navStore";
import { useUiStore } from "@/store/uiStore";

const ACTION_ICON: Record<PaletteAction, LucideIcon> = {
  settings: Settings,
  theme: SunMoon,
  "new-chat": MessageSquarePlus,
};

function entryIcon(e: PaletteEntry): LucideIcon {
  if (e.kind === "action") return ACTION_ICON[e.action];
  if (e.kind === "app") return ExternalLink;
  if (e.kind === "hub") return Compass;
  if (e.kind === "view") return ChevronRight;
  return Clock;
}

// Goes through the uiStore adapters, not navStore alone, so the old shell's booleans (and with
// them its active rail entry and tab) follow the palette.
function openRef(ref: ItemRef) {
  const ui = useUiStore.getState();
  useNavStore.getState().openItem(ref);
  ui.linkItem(ref);
  const nav = useNavStore.getState();
  ui.openView({ hub: nav.hub, view: nav.view[nav.hub] } as NavTarget);
}

export function CommandPalette() {
  const open = usePaletteStore((s) => s.open);
  const setOpen = usePaletteStore((s) => s.setOpen);

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!usePaletteStore.getState().open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {open && <PaletteBody onClose={() => setOpen(false)} />}
    </Dialog.Root>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [items, setItems] = useState<PaletteItem[]>([]);
  const recent = useNavStore((s) => s.recent);
  const privateRevealed = useUiStore((s) => s.privateRevealed);
  const { setTheme } = useTheme();

  useEffect(() => {
    let live = true;
    // A failed fetch only leaves out the apps or that hub's items; the rest of the palette works.
    fetchServices()
      .then((r) => live && setServices(r.services))
      .catch(() => undefined);
    Promise.all(itemProviders.map((p) => p().catch(() => [])))
      .then((lists) => live && setItems(lists.flat()));
    return () => {
      live = false;
    };
  }, []);

  const entries = useMemo(
    () => rankEntries(buildEntries({ recent, services, privateRevealed, items }), query),
    [recent, services, privateRevealed, items, query]
  );
  const active = Math.min(sel, entries.length - 1);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, entries]);

  function run(e: PaletteEntry | undefined) {
    if (!e) return;
    onClose();
    const ui = useUiStore.getState();
    if (e.kind === "hub") ui.openView({ hub: e.hub } as NavTarget);
    else if (e.kind === "view") ui.openView(e.target);
    else if (e.kind === "item") openRef(e.ref);
    else if (e.kind === "app") window.open(e.url, "_blank", "noopener,noreferrer");
    else if (e.action === "settings") ui.setSettingsOpen(true);
    else if (e.action === "theme") setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
    else {
      useChatStore.getState().newSession();
      ui.closeAll();
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setSel(Math.max(0, Math.min(entries.length - 1, active + step)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(entries[active]);
    } else if (e.key === "Escape") {
      // App.tsx closes the page under the palette on Escape; this one belongs to the palette.
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  }

  const grouped = query.trim() === "";

  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-[60] hidden bg-black/35 sm:block" />
      <Dialog.Popup
        initialFocus={inputRef}
        aria-label="Search"
        className={cn(
          "fixed inset-x-0 top-0 z-[60] flex flex-col bg-bg text-ink outline-none",
          // Phone: full screen, sized to the visual viewport (AppShell's useVisualViewportHeight
          // keeps --app-height in step) so the bottom field rides above the on-screen keyboard.
          "h-[var(--app-height,100dvh)] pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]",
          "sm:inset-x-auto sm:top-[11vh] sm:left-1/2 sm:h-auto sm:max-h-[min(440px,calc(100%-11vh-16px))] sm:w-[min(560px,calc(100%-32px))] sm:-translate-x-1/2 sm:overflow-hidden sm:rounded-xl sm:border sm:border-line sm:p-0 sm:shadow-[0_16px_40px_oklch(0_0_0/0.3)]"
        )}
      >
        <div className="flex min-h-[52px] shrink-0 items-center border-b border-line py-1 pr-1.5 pl-4 sm:hidden">
          <Dialog.Title className="flex-1 text-title font-semibold">Search</Dialog.Title>
          <Dialog.Close className="flex min-h-11 items-center rounded-md px-3 text-body text-ink-2 hover:bg-surface">
            Close
          </Dialog.Close>
        </div>
        <div
          ref={listRef}
          id="palette-list"
          role="listbox"
          aria-label="Results"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
        >
          {entries.length === 0 && (
            <p className="px-2.5 py-4 text-meta text-muted">Nothing matches. Try a hub, a view or an app.</p>
          )}
          {entries.map((e, i) => {
            const Icon = entryIcon(e);
            const header = grouped && (i === 0 || entries[i - 1].group !== e.group);
            const hint = grouped ? e.hint : [e.group, e.hint].filter(Boolean).join(" · ");
            return (
              <div key={e.key}>
                {header && <div className="px-2.5 pt-2 pb-0.5 text-caption text-muted">{e.group}</div>}
                <button
                  type="button"
                  id={`palette-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  tabIndex={-1}
                  onClick={() => run(e)}
                  onMouseMove={() => i !== active && setSel(i)}
                  className="flex min-h-12 w-full items-center gap-2.5 rounded-[7px] px-2.5 text-left text-body text-ink-2 aria-selected:bg-raised sm:min-h-0 sm:py-1.5 sm:text-meta"
                >
                  <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-ink">{e.label}</span>
                  {hint && <span className="max-w-[45%] truncate text-caption text-muted">{hint}</span>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2.5 border-t border-line py-1.5 pr-2.5 pb-[calc(6px+env(safe-area-inset-bottom))] pl-3.5 text-muted sm:order-first sm:border-t-0 sm:border-b sm:py-1.5 sm:pr-2 sm:pb-1.5">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSel(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Hubs, views, apps and actions"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={entries.length > 0 ? `palette-opt-${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted sm:h-8 sm:text-[15px]"
          />
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  );
}
