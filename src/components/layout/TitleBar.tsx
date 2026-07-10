import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { isTauri } from "@/lib/isTauri";
import { useUiStore } from "@/store/uiStore";

function handleClose() {
  if (!isTauri) return;
  void getCurrentWindow().close();
}

function handleMinimize() {
  if (!isTauri) return;
  void getCurrentWindow().minimize();
}

function handleMaximize() {
  if (!isTauri) return;
  void getCurrentWindow().toggleMaximize();
}

function WindowControls() {
  return (
    <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
      <button
        type="button"
        title="Minimize"
        onClick={handleMinimize}
        className="flex size-[22px] items-center justify-center rounded text-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Maximize / Restore"
        onClick={handleMaximize}
        className="flex size-[22px] items-center justify-center rounded text-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <Square className="size-3" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Close"
        onClick={handleClose}
        className="flex size-[22px] items-center justify-center rounded text-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function TitleBar() {
  const online = useUiStore((s) => s.online);

  return (
    <header
      className="flex h-9 shrink-0 items-center gap-3 border-b border-border px-3"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {isTauri && <WindowControls />}
      <span className="flex-1 text-sm font-medium tracking-wide text-muted">sazed</span>
      <span
        className={cn("size-1.5 rounded-full", online ? "bg-primary" : "bg-muted")}
        title={online ? "Connected" : "Offline"}
      />
    </header>
  );
}
