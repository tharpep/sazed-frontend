/** True only when running inside the Tauri desktop shell. */
export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
