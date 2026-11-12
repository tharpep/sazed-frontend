import { useContext, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { DetailSlotContext } from "./detailSlot";

interface DetailPanelProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

type Mode = "sheet" | "overlay" | "inline";

const INLINE_QUERY = "(min-width: 1180px)";

// Sheet detents from the plan; --app-height tracks the visual viewport, so the keyboard shrinks them.
const VIEW_H = "var(--app-height, 100dvh)";
const MEDIUM_MAX = `min(calc(${VIEW_H} * 0.64), calc(${VIEW_H} - env(safe-area-inset-top) - 72px))`;
const FULL_H = `calc(${VIEW_H} - env(safe-area-inset-top) - 10px)`;

const DRAG_CLOSE_PX = 70;
const DRAG_FULL_PX = 40;

function useWide(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(INLINE_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(INLINE_QUERY);
    const onChange = () => setWide(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return wide;
}

/**
 * Item detail: a bottom sheet with two detents on phones, a 400px right-hand panel from 640px,
 * overlaid with a scrim until 1180px and inline beside the page from there.
 */
export function DetailPanel({ open, title, description, onClose, footer, children }: DetailPanelProps) {
  const isMobile = useIsMobile();
  const wide = useWide();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [row, setRow] = useState<HTMLElement | null>(null);
  const [full, setFull] = useState(false);
  const [dragY, setDragY] = useState<number | null>(null);
  const drag = useRef<{ startY: number; moved: boolean } | null>(null);
  const lastDragAt = useRef(0);
  // Footer actions sit in the thumb zone; a double tap on a list row must not land on them while
  // the panel slides in.
  const [settled, setSettled] = useState(false);

  // Inline means a sibling of the page panel: the shell's row that holds <main>, so the page
  // narrows instead of being covered.
  useLayoutEffect(() => {
    setRow(anchorRef.current?.closest("main")?.parentElement ?? null);
  }, []);
  // The hub shell names its row outright, so a page with its own <main> (Journal) cannot misplace it.
  const slot = useContext(DetailSlotContext);
  const target = slot === undefined ? row : slot;

  const mode: Mode = isMobile ? "sheet" : wide && target ? "inline" : "overlay";

  // The grabber goes away on close or a mode change, possibly mid-drag, so its end event may never
  // come; a leftover offset would show on the next open with no slide-in.
  useEffect(() => {
    if (open && mode === "sheet") return;
    drag.current = null;
    setDragY(null);
    if (!open) {
      setFull(false);
      setSettled(false);
    }
  }, [open, mode]);

  function cancelDrag() {
    drag.current = null;
    setDragY(null);
  }

  function onGrabDown(e: PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, moved: false };
    setDragY(0);
  }

  function onGrabMove(e: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const d = e.clientY - drag.current.startY;
    if (Math.abs(d) > 6) drag.current.moved = true;
    setDragY(d);
  }

  function onGrabEnd(e: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const d = e.clientY - drag.current.startY;
    if (drag.current.moved) lastDragAt.current = Date.now();
    drag.current = null;
    setDragY(null);
    if (d > DRAG_CLOSE_PX) {
      if (full) setFull(false);
      else onClose();
    } else if (d < -DRAG_FULL_PX) {
      setFull(true);
    }
  }

  function onGrabClick() {
    // A drag ends with a click on the grabber; only a plain tap closes.
    if (Date.now() - lastDragAt.current < 400) return;
    onClose();
  }

  const popupClass = {
    sheet: cn(
      "fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-line",
      "transition-[translate,transform,height,max-height] duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
      "data-starting-style:translate-y-full data-ending-style:translate-y-full",
      dragY !== null && "transition-none"
    ),
    overlay: cn(
      "fixed inset-y-0 right-0 z-30 w-[min(400px,100%)] border-l border-line pr-[env(safe-area-inset-right)] shadow-lg",
      "transition-transform duration-[180ms] ease-out",
      "data-starting-style:translate-x-full data-ending-style:translate-x-full"
    ),
    inline: "w-[400px] shrink-0 my-2 mr-2 rounded-xl border border-line",
  }[mode];

  const sheetStyle =
    mode === "sheet"
      ? {
          height: full ? FULL_H : undefined,
          maxHeight: full ? undefined : MEDIUM_MAX,
          transform: dragY !== null ? `translateY(${dragY > 0 ? dragY : dragY / 3}px)` : undefined,
        }
      : undefined;

  return (
    <>
      <span ref={anchorRef} hidden />
      <Dialog.Root
        open={open}
        onOpenChange={(next) => !next && onClose()}
        onOpenChangeComplete={(isOpen) => setSettled(isOpen)}
        modal={mode !== "inline"}
        disablePointerDismissal={mode === "inline"}
      >
        <Dialog.Portal
          container={mode === "inline" ? target : undefined}
          className={mode === "inline" ? "flex shrink-0" : undefined}
        >
          {mode !== "inline" && (
            <Dialog.Backdrop
              className={cn(
                "fixed inset-0 bg-black/35 transition-opacity duration-[180ms] data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none",
                mode === "sheet" ? "z-50" : "z-30"
              )}
            />
          )}
          <Dialog.Popup
            ref={popupRef}
            initialFocus={popupRef}
            data-slot="detail-panel"
            data-mode={mode}
            data-detent={mode === "sheet" ? (full ? "full" : "medium") : undefined}
            style={sheetStyle}
            className={cn(
              "flex min-h-0 flex-col overflow-hidden bg-bg text-ink outline-none motion-reduce:transition-none",
              popupClass
            )}
          >
            {mode === "sheet" && (
              <button
                type="button"
                aria-label="Close. Drag up for full height"
                onPointerDown={onGrabDown}
                onPointerMove={onGrabMove}
                onPointerUp={onGrabEnd}
                onPointerCancel={cancelDrag}
                onClick={onGrabClick}
                className="relative z-10 -mb-[18px] grid h-11 w-full shrink-0 touch-none place-items-center outline-none focus-visible:[&>i]:bg-ink-2"
              >
                <i className="block h-1 w-9 -translate-y-2.5 rounded-full bg-line" />
              </button>
            )}

            <header
              className={cn(
                "flex shrink-0 gap-2.5 border-b border-line",
                mode === "sheet" ? "items-center py-2.5 pr-2 pl-[18px]" : "items-start py-3 pr-3 pl-[18px]"
              )}
            >
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-[15px] leading-[22px] font-semibold [overflow-wrap:anywhere]">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="text-xs leading-4 text-muted">{description}</Dialog.Description>
                )}
              </div>
              <Dialog.Close
                aria-label="Close"
                className={cn(
                  "grid shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink",
                  mode === "sheet" ? "size-11" : "size-8"
                )}
              >
                <XIcon className="size-4" aria-hidden="true" />
              </Dialog.Close>
            </header>

            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-[18px] py-3.5",
                mode === "sheet" && !footer && "pb-[calc(14px+env(safe-area-inset-bottom))]"
              )}
            >
              {children}
            </div>

            {footer && (
              <footer
                data-settled={settled || undefined}
                className={cn(
                  "flex shrink-0 flex-wrap gap-2 border-t border-line bg-bg",
                  !settled && "pointer-events-none motion-reduce:pointer-events-auto",
                  {
                    sheet: "px-3.5 pt-2.5 pb-[calc(12px+env(safe-area-inset-bottom))]",
                    overlay: "px-[18px] pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]",
                    inline: "px-[18px] py-3",
                  }[mode]
                )}
              >
                {footer}
              </footer>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
