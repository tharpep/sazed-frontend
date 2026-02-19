import { create } from "zustand";
import { persist } from "zustand/middleware";

const BUILD_BASE =
  (import.meta.env.VITE_SAZED_URL as string | undefined) || "http://localhost:8000";
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
        return s.useBuildDefaults ? BUILD_BASE : (s.apiBaseUrl || BUILD_BASE).replace(/\/$/, "");
      },
      getEffectiveKey: () => {
        const s = get();
        return s.useBuildDefaults ? BUILD_KEY : (s.apiKey ?? "");
      },
    }),
    { name: STORAGE_KEY }
  )
);
