import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";

interface SwipeRowProps {
  children: ReactNode;
  onSwipeLeft: () => void;
}

const SWIPE_PX = 72;

export function SwipeRow({ children, onSwipeLeft }: SwipeRowProps) {
  const [offset, setOffset] = useState(0);
  const gesture = useRef<{ startX: number; startY: number; horizontal: boolean } | null>(null);
  const ignoreClick = useRef(false);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // A mouse drag on a row is text selection, never a swipe.
    if (e.pointerType === "mouse") return;
    gesture.current = { startX: e.clientX, startY: e.clientY, horizontal: false };
    ignoreClick.current = false;
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!gesture.current) return;
    const dx = e.clientX - gesture.current.startX;
    const dy = e.clientY - gesture.current.startY;
    if (!gesture.current.horizontal && Math.abs(dy) > Math.abs(dx)) {
      gesture.current = null;
      setOffset(0);
      return;
    }
    // Capture only once the swipe is sure: a capture taken on pointerdown retargets the click to
    // this row, so a tap on the row's own buttons would never reach them.
    if (!gesture.current.horizontal && Math.abs(dx) > 8) {
      gesture.current.horizontal = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (gesture.current.horizontal) setOffset(Math.min(0, dx));
  }

  function onPointerUp() {
    if (!gesture.current) return;
    if (offset <= -SWIPE_PX) {
      ignoreClick.current = true;
      onSwipeLeft();
    }
    gesture.current = null;
    setOffset(0);
  }

  function onClickCapture(e: MouseEvent<HTMLDivElement>) {
    if (!ignoreClick.current) return;
    e.preventDefault();
    e.stopPropagation();
    ignoreClick.current = false;
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        gesture.current = null;
        setOffset(0);
      }}
      onClickCapture={onClickCapture}
      className="overflow-hidden touch-pan-y"
    >
      <div className="transition-transform duration-150" style={{ transform: `translateX(${offset}px)` }}>
        {children}
      </div>
    </div>
  );
}
