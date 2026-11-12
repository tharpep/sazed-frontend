import { Settings } from "lucide-react";

import { useWaitingCount } from "@/hooks/useWaitingCount";
import { HUB_VIEWS } from "@/nav/hubViews";
import { useNavStore } from "@/store/navStore";
import { HUB_ICON } from "./hubMeta";

interface HubRailProps {
  onSettings: () => void;
}

const item =
  "relative grid w-14 flex-none justify-items-center gap-0.5 rounded-lg pt-1.5 pb-1 text-caption leading-[14px] text-muted transition-colors hover:text-ink aria-[current=page]:bg-surface aria-[current=page]:text-ink dark:aria-[current=page]:bg-raised";

/** The desktop rail: every hub and Apps, icon above label, then the gear. */
export function HubRail({ onSettings }: HubRailProps) {
  const hub = useNavStore((s) => s.hub);
  const go = useNavStore((s) => s.go);
  const waiting = useWaitingCount();

  return (
    <nav aria-label="Hubs" className="flex w-(--rail-w) flex-none flex-col items-center gap-0.5 py-2">
      <span className="mt-1 mb-2 grid size-[22px] place-items-center rounded-md bg-ink text-caption font-semibold text-bg" aria-hidden="true">
        S
      </span>
      {HUB_VIEWS.map((h) => {
        const Icon = HUB_ICON[h.id];
        return (
          <button
            key={h.id}
            type="button"
            onClick={() => go(h.id)}
            aria-current={hub === h.id ? "page" : undefined}
            className={item}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
            {h.label}
            {h.id === "home" && waiting > 0 && (
              <b className="absolute top-[3px] right-[7px] font-mono text-caption leading-[14px] font-medium text-warn">{waiting}</b>
            )}
          </button>
        );
      })}
      <span className="flex-1" />
      <button type="button" onClick={onSettings} className={item}>
        <Settings className="size-[18px]" aria-hidden="true" />
        Settings
      </button>
    </nav>
  );
}
