import { create } from "zustand";

interface ConfigState {
  sazedUrl: string;
  apiKey: string;
  loaded: boolean;
  setConfig: (sazedUrl: string, apiKey: string) => void;
}

// Non-persisted — config is fetched from the server after auth every page load
export const useConfigStore = create<ConfigState>((set) => ({
  sazedUrl: "",
  apiKey: "",
  loaded: false,
  setConfig: (sazedUrl, apiKey) => set({ sazedUrl, apiKey, loaded: true }),
}));
