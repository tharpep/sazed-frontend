import { create } from "zustand";

interface UiState {
  historyOpen: boolean;
  online: boolean;
  toggleHistory: () => void;
  setHistoryOpen: (v: boolean) => void;
  setOnline: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  historyOpen: false,
  online: false,
  toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen })),
  setHistoryOpen: (v) => set({ historyOpen: v }),
  setOnline: (v) => set({ online: v }),
}));
