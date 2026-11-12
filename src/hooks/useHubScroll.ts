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

/** Saves the content scroller's position under `hubView` and puts it back when the view mounts.
 * Pages cannot yet say when their first data has rendered, so the restore retries each frame, for
 * up to two seconds, until the content is tall enough; a touch, wheel or key from Pryce stops it. */
export function useHubScroll(ref: RefObject<HTMLElement | null>, hubView: string) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const target = useNavStore.getState().scroll[hubView] ?? 0;
    const started = performance.now();
    let frame = 0;

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    function restore() {
      const el = mainScroller(root!);
      if (el) {
        el.scrollTop = target;
        if (Math.abs(el.scrollTop - target) < 1) return stop();
      }
      if (performance.now() - started > RESTORE_MS) return stop();
      frame = requestAnimationFrame(restore);
    }

    let known: HTMLElement | null = null;
    function onScroll(e: Event) {
      if (frame) return;
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      if (el !== known) {
        if (el !== mainScroller(root!)) return;
        known = el;
      }
      useNavStore.getState().setScroll(hubView, el.scrollTop);
    }

    if (target > 0) frame = requestAnimationFrame(restore);
    root.addEventListener("scroll", onScroll, { capture: true, passive: true });
    for (const type of ["wheel", "touchstart", "keydown"]) root.addEventListener(type, stop, { passive: true });
    return () => {
      stop();
      root.removeEventListener("scroll", onScroll, { capture: true });
      for (const type of ["wheel", "touchstart", "keydown"]) root.removeEventListener(type, stop);
    };
  }, [ref, hubView]);
}
