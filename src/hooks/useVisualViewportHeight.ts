import { useEffect } from "react";

/** Keeps a --app-height CSS var in sync with window.visualViewport, so the
 * shell can stay pinned above an on-screen keyboard on mobile browsers where
 * 100dvh doesn't reliably shrink when the keyboard opens. No-ops (falls back
 * to the 100dvh default in CSS) where visualViewport isn't available. */
export function useVisualViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      document.documentElement.style.setProperty("--app-height", `${vv!.height}px`);
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
