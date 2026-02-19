import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useConfigStore } from "./configStore";

// VITE_ vars are only populated in local/Tauri builds.
// On Vercel, these are empty — config is fetched from /api/config after auth.
const BUILD_BASE =
  (import.meta.env.VITE_SAZED_URL as string | undefined) || "";
const BUILD_KEY = (import.meta.env.VITE_API_KEY as string | undefined) || "";

export interface SettingsState {
  useBuildDefaults: boolean;
  apiBaseUrl: string;
  apiKey: string;
  setUseBuildDefaults: (v: boolean) => void;
  setApiBaseUrl: (v: string) => void;
  setApiKey: (v: string) => void;
  save: (overrides: { apiBaseUrl?: string; apiKey?: string; useBuildDefaults?: boolean }) => void;
  getEffectiveBase: () => string;
  getEffectiveKey: () => string;
}

const STORAGE_KEY = "sazed-settings";

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      useBuildDefaults: true,
      apiBaseUrl: BUILD_BASE,
      apiKey: BUILD_KEY,

      setUseBuildDefaults: (v) => set({ useBuildDefaults: v }),
      setApiBaseUrl: (v) => set({ apiBaseUrl: v }),
      setApiKey: (v) => set({ apiKey: v }),

      save: (overrides) =>
        set((s) => {
          const next = { ...s, ...overrides };
          return next;
        }),

      getEffectiveBase: () => {
        const s = get();
        if (!s.useBuildDefaults) return (s.apiBaseUrl || BUILD_BASE).replace(/\/$/, "");
        // Prefer VITE_ var (Tauri/local), fall back to server-fetched config (Vercel)
        return (BUILD_BASE || useConfigStore.getState().sazedUrl).replace(/\/$/, "");
      },
      getEffectiveKey: () => {
        const s = get();
        if (!s.useBuildDefaults) return s.apiKey ?? "";
        return BUILD_KEY || useConfigStore.getState().apiKey;
      },
    }),
    { name: STORAGE_KEY }
  )
);
