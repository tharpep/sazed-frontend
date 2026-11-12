import { useEffect } from "react";

// More shrink than any browser toolbar collapse: below this the on-screen keyboard is up.
const KEYBOARD_MIN_PX = 150;

/** Keeps a --app-height CSS var in sync with window.visualViewport, so the
 * shell can stay pinned above an on-screen keyboard on mobile browsers where
 * 100dvh doesn't reliably shrink when the keyboard opens. No-ops (falls back
 * to the 100dvh default in CSS) where visualViewport isn't available.
 * Also publishes --app-offset-top, because iOS scrolls the layout viewport when
 * the keyboard opens and a fixed top-0 element then sits above the visible area,
 * and --keyboard-safe-bottom, 0px while the keyboard covers the home indicator
 * (unset otherwise, so users fall back to the safe-area inset). */
export function useVisualViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement.style;

    function update() {
      root.setProperty("--app-height", `${vv!.height}px`);
      root.setProperty("--app-offset-top", `${vv!.offsetTop}px`);
      const keyboardUp = vv!.scale <= 1.01 && window.innerHeight - vv!.height > KEYBOARD_MIN_PX;
      if (keyboardUp) root.setProperty("--keyboard-safe-bottom", "0px");
      else root.removeProperty("--keyboard-safe-bottom");
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
}
