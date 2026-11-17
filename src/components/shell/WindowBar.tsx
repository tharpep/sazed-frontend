import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

import { cn } from "@/lib/utils";

const control =
  "flex size-[22px] items-center justify-center rounded text-muted transition-colors hover:bg-surface hover:text-ink";

/** The desktop app's window bar (the Tauri window has no native frame): close, minimize and
 * maximize, and a drag area. Render it only under Tauri. */
export function WindowBar() {
  return (
    // Tauri starts a drag only when the pressed element itself carries the attribute, so the
    // spacer carries it too and the buttons never do.
    <header data-tauri-drag-region className="flex h-8 flex-none items-center gap-0.5 px-2">
      <button type="button" title="Minimize" aria-label="Minimize" onClick={() => void getCurrentWindow().minimize()} className={control}>
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Maximize / Restore"
        aria-label="Maximize or restore"
        onClick={() => void getCurrentWindow().toggleMaximize()}
        className={control}
      >
        <Square className="size-3" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Close"
        aria-label="Close"
        onClick={() => void getCurrentWindow().close()}
        className={cn(control, "hover:bg-destructive/10 hover:text-destructive")}
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
      <span data-tauri-drag-region className="flex-1 self-stretch" />
    </header>
  );
}
