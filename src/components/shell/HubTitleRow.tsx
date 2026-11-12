import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { useNavStore } from "@/store/navStore";
import { hasViewTabs, hubDef, type ShellAction } from "./hubMeta";

interface HubTitleRowProps {
  onSearch: () => void;
  action?: ShellAction;
}

const MOD_KEY = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K";

function SearchField({ onSearch, className }: { onSearch: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onSearch}
      aria-label={`Search, ${MOD_KEY}`}
      className={cn(
        "flex h-[30px] w-[168px] flex-none items-center gap-2 rounded-lg border border-line bg-surface pr-1.5 pl-2 text-left text-meta text-muted transition-colors hover:text-ink",
        className
      )}
    >
      <Search className="size-4" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">Search</span>
      <kbd className="rounded border border-line px-1 font-mono text-caption whitespace-nowrap text-muted">{MOD_KEY}</kbd>
    </button>
  );
}

/** The desktop page's 48px title row: hub name, view tabs, primary action and search. Home has no
 * row, only the search field in the corner. */
export function HubTitleRow({ onSearch, action }: HubTitleRowProps) {
  const hub = useNavStore((s) => s.hub);
  const view = useNavStore((s) => s.view[s.hub]);
  const go = useNavStore((s) => s.go);

  if (hub === "home") return <SearchField onSearch={onSearch} className="absolute top-2.5 right-3 z-10" />;

  const def = hubDef(hub);
  return (
    <header className="flex h-(--title-h) min-w-0 flex-none items-center gap-3 border-b border-line pr-3 pl-6">
      <h1 className="text-title font-semibold whitespace-nowrap text-ink">{def.label}</h1>
      {hasViewTabs(hub) && (
        <div
          role="tablist"
          aria-label={`${def.label} views`}
          className="flex min-w-0 gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface p-0.5 [scrollbar-width:none]"
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
                  "flex-none rounded-md px-2.5 py-1 text-meta whitespace-nowrap transition-colors hover:text-ink",
                  selected ? "bg-raised text-ink" : "text-ink-2"
                )}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      )}
      <span className="flex-1" />
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="h-7 flex-none rounded-[7px] border border-line bg-surface px-2.5 text-meta whitespace-nowrap text-ink transition-colors hover:bg-raised"
        >
          {action.label}
        </button>
      )}
      <SearchField onSearch={onSearch} />
    </header>
  );
}
