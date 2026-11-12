import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  LayoutPanelLeft,
  MessageSquarePlus,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react";

import { fetchServices, type Service } from "@/api/homelab";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import type { NavTarget } from "@/nav/hubViews";
import {
  buildEntries,
  isShortcut,
  itemProviders,
  rankEntries,
  type ShortcutKeys,
  usePaletteStore,
  type PaletteAction,
  type PaletteEntry,
  type PaletteItem,
} from "@/nav/paletteSources";
import { useChatStore } from "@/store/chatStore";
import { useShellStore } from "@/nav/shellFlag";
import { useNavStore, type ItemRef } from "@/store/navStore";
import { useUiStore } from "@/store/uiStore";

const ACTION_ICON: Record<PaletteAction, LucideIcon> = {
  settings: Settings,
  "new-chat": MessageSquarePlus,
  "theme:light": Sun,
  "theme:dark": Moon,
  "theme:system": Monitor,
  "shell:hubs": LayoutPanelLeft,
  "shell:old": LayoutPanelLeft,
};

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const isPaletteShortcut = (e: ShortcutKeys) => isShortcut(e, IS_MAC);

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
      if (!isPaletteShortcut(e)) return;
      e.preventDefault();
      setOpen(true);
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
  const [selKey, setSelKey] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [items, setItems] = useState<PaletteItem[]>([]);
  const recent = useNavStore((s) => s.recent);
  const privateRevealed = useUiStore((s) => s.privateRevealed);
  const shell = useShellStore((s) => s.shell);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    let live = true;
    // A failed fetch only leaves out the apps or that hub's items; the rest of the palette works.
    fetchServices()
      .then((r) => live && setServices(r.services))
      .catch(() => undefined);
    Promise.all(itemProviders.map((p) => p().catch(() => []))).then((lists) => live && setItems(lists.flat()));
    return () => {
      live = false;
    };
  }, []);

  const entries = useMemo(
    () => rankEntries(buildEntries({ recent, services, privateRevealed, items, theme, shell }), query),
    [recent, services, privateRevealed, items, theme, shell, query]
  );
  // Selection follows the entry, not its row, so apps arriving late never shift it onto another.
  const found = entries.findIndex((e) => e.key === selKey);
  const active = found >= 0 ? found : 0;

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
    // The hub shell's Settings is a dialog over the current hub; the old shell's is a page.
    else if (e.action === "settings") {
      if (shell === "hubs") useShellStore.getState().setSettingsOpen(true);
      else ui.setSettingsOpen(true);
    } else if (e.action === "shell:hubs" || e.action === "shell:old") useShellStore.getState().setShell(e.action === "shell:hubs" ? "hubs" : "old");
    else if (e.action === "new-chat") {
      useChatStore.getState().newSession();
      ui.closeAll();
    } else setTheme(e.action === "theme:light" ? "light" : e.action === "theme:dark" ? "dark" : "system");
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      // From the previous key, not this render's index, so held-down repeats never drop a step.
      setSelKey((prev) => {
        const from = Math.max(0, entries.findIndex((x) => x.key === prev));
        return entries[Math.max(0, Math.min(entries.length - 1, from + step))]?.key ?? null;
      });
    } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      run(entries[active]);
    }
  }

  // Every key stops here. The pages and sheets underneath listen on window and document (Journal's
  // Ctrl+Enter and "n", each Base UI dialog's Escape), and none of them may act while the palette
  // is open; that includes Base UI's own Escape for this dialog, so the palette closes itself.
  function onPopupKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (e.key === "Escape" || isPaletteShortcut(e)) {
      e.preventDefault();
      onClose();
    }
  }

  const q = query.trim();
  const sections = useMemo(() => {
    if (q) return [{ group: null, start: 0, rows: entries }];
    const out: { group: string | null; start: number; rows: PaletteEntry[] }[] = [];
    entries.forEach((e, i) => {
      const last = out[out.length - 1];
      if (last && last.group === e.group) last.rows.push(e);
      else out.push({ group: e.group, start: i, rows: [e] });
    });
    return out;
  }, [entries, q]);

  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-[60] hidden bg-black/35 sm:block" />
      <Dialog.Popup
        initialFocus={inputRef}
        aria-label="Search"
        onKeyDown={onPopupKeyDown}
        // Focus stays in the field: a tap on padding, a header or a row must not blur it (on a phone
        // that would drop the keyboard). Rows still get their click.
        onMouseDown={(e) => {
          if (e.target !== inputRef.current) e.preventDefault();
        }}
        className={cn(
          "fixed inset-x-0 z-[60] flex flex-col bg-bg text-ink outline-none",
          // Phone: full screen over the visual viewport. AppShell's useVisualViewportHeight keeps the
          // height and offset in step, so the bottom field rides above the on-screen keyboard even
          // when iOS scrolls the page under it.
          "top-[var(--app-offset-top,0px)] h-[var(--app-height,100dvh)] pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]",
          "sm:inset-x-auto sm:top-[11vh] sm:left-1/2 sm:h-auto sm:max-h-[min(440px,calc(100%-11vh-16px))] sm:w-[min(560px,calc(100%-32px))] sm:-translate-x-1/2 sm:overflow-hidden sm:rounded-xl sm:border sm:border-line sm:p-0 sm:shadow-[0_16px_40px_oklch(0_0_0/0.3)]"
        )}
      >
        <div className="flex min-h-[52px] shrink-0 items-center border-b border-line py-1 pr-1.5 pl-4 sm:hidden">
          <Dialog.Title className="flex-1 text-title font-semibold">Search</Dialog.Title>
          <Dialog.Close className="flex min-h-11 items-center rounded-md px-3 text-body text-ink-2 hover:bg-surface">
            Close
          </Dialog.Close>
        </div>
        {entries.length === 0 && (
          <p className="shrink-0 px-3.5 py-4 text-meta text-muted">Nothing matches. Try a hub, a view or an app.</p>
        )}
        <div
          ref={listRef}
          id="palette-list"
          role="listbox"
          aria-label="Results"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
        >
          {sections.map((sec) => {
            const rows = sec.rows.map((e, j) => {
              const i = sec.start + j;
              const Icon = entryIcon(e);
              const hint = sec.group ? e.hint : [e.group, e.hint].filter(Boolean).join(" · ");
              return (
                <button
                  key={e.key}
                  type="button"
                  id={`palette-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  tabIndex={-1}
                  onClick={() => run(e)}
                  onMouseMove={() => i !== active && setSelKey(e.key)}
                  className="flex min-h-12 w-full items-center gap-2.5 rounded-[7px] px-2.5 text-left text-body text-ink-2 aria-selected:bg-raised sm:min-h-0 sm:py-1.5 sm:text-meta"
                >
                  <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-ink">{e.label}</span>
                  {hint && <span className="max-w-[45%] truncate text-caption text-muted">{hint}</span>}
                </button>
              );
            });
            if (!sec.group) return rows;
            const headId = `palette-group-${sec.group}`;
            return (
              <div key={sec.group} role="group" aria-labelledby={headId}>
                <div id={headId} className="px-2.5 pt-2 pb-0.5 text-caption text-muted">
                  {sec.group}
                </div>
                {rows}
              </div>
            );
          })}
        </div>
        <p aria-live="polite" className="sr-only">
          {q ? (entries.length === 0 ? "Nothing matches" : `${entries.length} ${entries.length === 1 ? "result" : "results"}`) : ""}
        </p>
        <div className="flex shrink-0 items-center gap-2.5 border-t border-line py-1.5 pr-2.5 pb-[calc(6px+var(--keyboard-safe-bottom,env(safe-area-inset-bottom)))] pl-3.5 text-muted sm:order-first sm:border-t-0 sm:border-b sm:py-1.5 sm:pr-2 sm:pb-1.5">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelKey(null);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Hubs, views, apps and actions"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-autocomplete="list"
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
