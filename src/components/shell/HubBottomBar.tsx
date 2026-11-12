import type { ReactNode } from "react";
import { Ellipsis, LoaderCircle } from "lucide-react";

import { useWaitingCount } from "@/hooks/useWaitingCount";
import { useNavStore } from "@/store/navStore";
import { HUB_ICON, MORE_HUBS, PHONE_BAR_HUBS, hubDef } from "./hubMeta";

interface HubBottomBarProps {
  moreOpen: boolean;
  onMore: () => void;
  // From useRunningCount in the parent, which also feeds the More sheet; one poll serves both.
  running: number;
}

const slot =
  "grid min-h-14 min-w-0 content-center justify-items-center gap-0.5 text-caption whitespace-nowrap text-muted aria-[current=page]:font-medium aria-[current=page]:text-ink";
const pill =
  "relative grid h-[26px] w-12 place-items-center rounded-[13px] in-aria-[current=page]:bg-raised";

function Badge({ children }: { children: ReactNode }) {
  return <b className="absolute -top-0.5 right-0.5 font-mono text-caption leading-none font-medium text-warn">{children}</b>;
}

/** The phone's hub bar: Home, Chat, Work, Apps and More. More takes the name of an open
 * Agents, System or Library hub. */
export function HubBottomBar({ moreOpen, onMore, running }: HubBottomBarProps) {
  const hub = useNavStore((s) => s.hub);
  const go = useNavStore((s) => s.go);
  const waiting = useWaitingCount();

  const outHub = (MORE_HUBS as readonly string[]).includes(hub) ? hub : null;
  const OutIcon = outHub ? HUB_ICON[outHub] : Ellipsis;
  const outLabel = outHub ? hubDef(outHub).label : "More";
  const spin = running > 0 && outHub !== "agents";

  return (
    <nav
      aria-label="Hubs"
      className="relative z-(--z-bar) grid flex-none grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      {PHONE_BAR_HUBS.map((id) => {
        const Icon = HUB_ICON[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => go(id)}
            aria-current={hub === id ? "page" : undefined}
            className={slot}
          >
            <span className={pill}>
              <Icon className="size-5" aria-hidden="true" />
              {id === "home" && waiting > 0 && <Badge>{waiting}</Badge>}
            </span>
            {hubDef(id).label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        aria-expanded={moreOpen}
        aria-label={`${outHub ? `${outLabel} is open. More` : "More"}${spin ? `, ${running} running` : ""}`}
        aria-current={outHub ? "page" : undefined}
        className={slot}
      >
        <span className={pill}>
          <OutIcon className="size-5" aria-hidden="true" />
          {outHub && <Ellipsis className="absolute -top-2.5 right-3 size-4 text-ink-2" aria-hidden="true" />}
          {spin && (
            <LoaderCircle className="absolute -top-1 left-0.5 size-2.5 text-ink-2 motion-safe:animate-spin" aria-hidden="true" />
          )}
        </span>
        {outLabel}
      </button>
    </nav>
  );
}
