import { useEffect, type RefObject } from "react";

import { useNavStore } from "@/store/navStore";

// How long a restore keeps waiting for the page's data to make it tall enough.
const RESTORE_MS = 2000;

function scrolls(el: Element) {
  const y = getComputedStyle(el).overflowY;
  return y === "auto" || y === "scroll";
}

/** The page's own scroller: the tallest scrollable element inside the content slot. Pages still
 * own their scrolling until their hub slice, so the slot itself never scrolls. */
function mainScroller(root: HTMLElement): HTMLElement | null {
  let best: HTMLElement | null = scrolls(root) ? root : null;
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    if (el.clientHeight > (best?.clientHeight ?? 0) && scrolls(el)) best = el;
  }
  return best;
}

/** Saves the content scroller's position under `hubView` and puts it back when the view mounts;
 * null leaves the page's scroll alone. Pages cannot yet say when their first data has rendered, so
 * the restore retries each frame, for up to two seconds, until the content is tall enough. A
 * pointer, wheel or key from Pryce, or a scroll the restore did not make, stops it. */
export function useHubScroll(ref: RefObject<HTMLElement | null>, hubView: string | null) {
  useEffect(() => {
    const root = ref.current;
    if (!root || hubView === null) return;
    const target = useNavStore.getState().scroll[hubView] ?? 0;
    const started = performance.now();
    let frame = 0;
    let scroller: HTMLElement | null = null;
    let lastSet = -1;

    function current() {
      if (!scroller?.isConnected) scroller = mainScroller(root!);
      return scroller;
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    function restore() {
      // The page swaps its loading state for its content during the restore, so look again each
      // frame until it ends; afterwards the scroller found here is cached.
      scroller = mainScroller(root!);
      if (scroller) {
        scroller.scrollTop = target;
        lastSet = scroller.scrollTop;
        if (Math.abs(lastSet - target) < 1) return stop();
      }
      if (performance.now() - started > RESTORE_MS) return stop();
      frame = requestAnimationFrame(restore);
    }

    function onScroll(e: Event) {
      if (e.target !== current()) return;
      const top = scroller!.scrollTop;
      if (frame) {
        if (Math.abs(top - lastSet) < 1) return;
        stop();
      }
      useNavStore.getState().setScroll(hubView!, top);
    }

    if (target > 0) frame = requestAnimationFrame(restore);
    const stops = ["wheel", "pointerdown", "keydown"] as const;
    root.addEventListener("scroll", onScroll, { capture: true, passive: true });
    for (const type of stops) root.addEventListener(type, stop, { capture: true, passive: true });
    return () => {
      stop();
      root.removeEventListener("scroll", onScroll, { capture: true });
      for (const type of stops) root.removeEventListener(type, stop, { capture: true });
    };
  }, [ref, hubView]);
}
