import { Search, Settings } from "lucide-react";

import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { HubId } from "@/nav/hubViews";
import { useNavStore } from "@/store/navStore";
import { HUB_ICON, MORE_HUBS, hubDef, shortLabel } from "./hubMeta";
import { SHEET_CLASS, SHEET_CLOSE_CLASS, SHEET_ROW_CLASS } from "./sheetClasses";

interface HubMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: () => void;
  onSettings: () => void;
  summaries?: Partial<Record<HubId, string>>;
}

/** Agents, System and Library with their views as chips, then Settings and Search. */
export function HubMoreSheet({ open, onOpenChange, onSearch, onSettings, summaries = {} }: HubMoreSheetProps) {
  const hub = useNavStore((s) => s.hub);
  const views = useNavStore((s) => s.view);
  const go = useNavStore((s) => s.go);

  function goTo(id: HubId, view?: string) {
    go(id, view);
    onOpenChange(false);
  }

  function then(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className={cn(SHEET_CLASS, "max-h-[calc(100%_-_env(safe-area-inset-top)_-_72px)]")}>
        <SheetHeader className="flex-row items-center border-b border-line py-1.5 pr-1.5 pl-[18px]">
          <SheetTitle className="flex-1">More</SheetTitle>
          <SheetClose className={SHEET_CLOSE_CLASS}>Close</SheetClose>
        </SheetHeader>
        <div className="flex flex-col gap-0.5 overflow-y-auto px-2.5 pt-1 pb-3.5">
          {MORE_HUBS.map((id) => {
            const def = hubDef(id);
            const Icon = HUB_ICON[id];
            return (
              <div key={id}>
                <button
                  type="button"
                  onClick={() => goTo(id)}
                  aria-current={hub === id ? "page" : undefined}
                  className={cn(SHEET_ROW_CLASS, "aria-[current=page]:bg-raised")}
                >
                  <Icon className="size-5 justify-self-center text-ink-2" aria-hidden="true" />
                  <span>
                    <span className="block font-medium">{def.label}</span>
                    {summaries[id] && <span className="block truncate text-caption text-muted">{summaries[id]}</span>}
                  </span>
                </button>
                <div className="flex flex-wrap gap-1.5 pt-0.5 pr-1.5 pb-2.5 pl-11">
                  {def.views.map((v) => {
                    const current = hub === id && views[id] === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => goTo(id, v.id)}
                        aria-current={current ? "true" : undefined}
                        className={cn(
                          "min-h-11 whitespace-nowrap rounded-[9px] border border-line bg-surface px-3 text-meta text-ink-2 transition-colors hover:bg-raised",
                          current && "border-ink-2 font-medium text-ink"
                        )}
                      >
                        {shortLabel(id, v)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="my-1 h-px bg-line" />
          <button type="button" onClick={() => then(onSettings)} className={SHEET_ROW_CLASS}>
            <Settings className="size-5 justify-self-center text-ink-2" aria-hidden="true" />
            <span>
              <span className="block font-medium">Settings</span>
              <span className="block text-caption text-muted">Theme, connection and old sessions</span>
            </span>
          </button>
          <button type="button" onClick={() => then(onSearch)} className={SHEET_ROW_CLASS}>
            <Search className="size-5 justify-self-center text-ink-2" aria-hidden="true" />
            <span>
              <span className="block font-medium">Search</span>
              <span className="block text-caption text-muted">Every hub, view, app and item</span>
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
